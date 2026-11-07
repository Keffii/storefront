import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { isDbConfigured, stripeConfig } from "@/lib/server/config";
import { incrementMetric } from "@/lib/server/metrics";
import { createOrder, setOrderStatus, type Order, type OrderLine } from "@/lib/server/orders";
import { stripe } from "@/lib/server/stripe";

export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Verifies the signature on the raw body, then records the
 * order. Writes are conditional, so Stripe's retries never create duplicates.
 */
export async function POST(req: NextRequest) {
  if (!stripeConfig.secretKey || !stripeConfig.webhookSecret) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing signature" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, stripeConfig.webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!isDbConfigured()) {
    console.error("[webhook] DynamoDB not configured; event", event.id, "not stored");
    return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const created = await createOrder(await toOrder(session));
        if (created && session.payment_status === "paid") {
          await incrementMetric("purchase", session.metadata?.arm ?? null);
        }
        break;
      }
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        if (await setOrderStatus(session.id, "paid", ["pending_payment"])) {
          await incrementMetric("purchase", session.metadata?.arm ?? null);
        }
        break;
      }
      case "checkout.session.async_payment_failed":
        await setOrderStatus(event.data.object.id, "failed", ["pending_payment"]);
        break;
    }
  } catch (err) {
    console.error("[webhook] failed to handle", event.type, event.id, err);
    // A 500 makes Stripe retry later.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function toOrder(session: Stripe.Checkout.Session): Promise<Order> {
  const items = await stripe().checkout.sessions.listLineItems(session.id, {
    limit: 100,
    expand: ["data.price.product"],
  });
  const lines: OrderLine[] = items.data.map((li) => {
    const product = li.price?.product as Stripe.Product | undefined;
    return {
      slug: product?.metadata?.slug ?? "",
      variantId: product?.metadata?.variantId ?? "",
      name: li.description ?? product?.name ?? "",
      quantity: li.quantity ?? 1,
      unitAmount: li.price?.unit_amount ?? 0,
      total: li.amount_total,
    };
  });
  const shipping = session.collected_information?.shipping_details ?? null;
  const now = new Date().toISOString();
  return {
    id: session.id,
    createdAt: new Date(session.created * 1000).toISOString(),
    updatedAt: now,
    status: session.payment_status === "paid" ? "paid" : "pending_payment",
    email: session.customer_details?.email ?? null,
    name: shipping?.name ?? session.customer_details?.name ?? null,
    address: shipping?.address
      ? {
          line1: shipping.address.line1,
          line2: shipping.address.line2,
          postalCode: shipping.address.postal_code,
          city: shipping.address.city,
          country: shipping.address.country,
        }
      : null,
    lines,
    subtotal: session.amount_subtotal ?? 0,
    shipping: session.shipping_cost?.amount_total ?? 0,
    total: session.amount_total ?? 0,
    currency: session.currency ?? "sek",
    paymentMethod: await paymentMethodType(session),
  };
}

/** "card" or "klarna": the method the customer actually used. */
async function paymentMethodType(session: Stripe.Checkout.Session): Promise<string | null> {
  const id = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!id) return null;
  try {
    const intent = await stripe().paymentIntents.retrieve(id, { expand: ["payment_method"] });
    return (intent.payment_method as Stripe.PaymentMethod | null)?.type ?? null;
  } catch {
    return null;
  }
}
