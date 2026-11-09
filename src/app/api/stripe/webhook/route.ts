import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { isDbConfigured, stripeConfig } from "@/lib/server/config";
import { incrementMetric } from "@/lib/server/metrics";
import { giftCardEmail, sendEmail, sendOrderConfirmation } from "@/lib/server/email";
import { issueGiftCard, redeemGiftCard } from "@/lib/server/gift-cards";
import { decrementStock, INVENTORY_TAG } from "@/lib/server/inventory";
import { createOrder, getOrder, markStockIssues, setOrderStatus, updateOrder, type Order, type OrderLine } from "@/lib/server/orders";
import { reportMetric } from "@/lib/server/monitoring";
import { deleteSavedCart } from "@/lib/server/saved-carts";
import { stripe } from "@/lib/server/stripe";
import { pickupPoints } from "@/lib/pickup-points";
import { isShippingMethodId, shippingMethod } from "@/lib/shipping";

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
        if (session.metadata?.kind === "giftcard") {
          if (session.payment_status === "paid") await issueCardFor(session);
          break;
        }
        const order = await toOrder(session);
        const created = await createOrder(order);
        if (created && session.payment_status === "paid") {
          await takeFromStock(order);
          await takeFromGiftCard(order);
          await forgetSavedCart(order);
          await incrementMetric("purchase", session.metadata?.arm ?? null);
          await sendOrderConfirmation(order);
        }
        break;
      }
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        if (session.metadata?.kind === "giftcard") {
          await issueCardFor(session);
          break;
        }
        if (await setOrderStatus(session.id, "paid", ["pending_payment"])) {
          const order = await getOrder(session.id);
          if (order) {
            await takeFromStock(order);
            await takeFromGiftCard(order);
            await forgetSavedCart(order);
            await sendOrderConfirmation({ ...order, status: "paid" });
          }
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
    await reportMetric("WebhookErrors");
    // A 500 makes Stripe retry later.
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/**
 * Lowers stock for a paid order. Runs once per order (only on the transition
 * to paid). If two customers paid for the last unit at the same moment, the
 * conditional write refuses the second decrement and the order is flagged
 * for the admin instead of letting stock go negative.
 */
/** A paid order means the saved cart did its job: no reminder for it. */
async function forgetSavedCart(order: Order) {
  if (order.customerSub) await deleteSavedCart(order.customerSub).catch(() => {});
}

async function takeFromStock(order: Order) {
  const issues: string[] = [];
  for (const l of order.lines) {
    if (!l.slug || !l.variantId) continue;
    if (!(await decrementStock(l.slug, l.variantId, l.quantity))) issues.push(`${l.slug}:${l.variantId}`);
  }
  if (issues.length) await markStockIssues(order.id, issues);
  revalidateTag(INVENTORY_TAG);
}

/** Issues and emails the gift card for a paid purchase (once per session). */
async function issueCardFor(session: Stripe.Checkout.Session) {
  const m = session.metadata ?? {};
  const buyerEmail = session.customer_details?.email ?? null;
  const card = await issueGiftCard({
    initial: Number(m.amount) || session.amount_total || 0,
    purchaseSessionId: session.id,
    buyerEmail,
    recipientEmail: m.recipientEmail || null,
    recipientName: m.recipientName || null,
    message: m.message || null,
  });
  if (!card) return;
  const mail = giftCardEmail(card);
  const to = card.recipientEmail ?? buyerEmail;
  if (to) await sendEmail(to, mail.subject, mail.html, mail.text);
  // The buyer gets a copy when the card went to someone else.
  if (buyerEmail && card.recipientEmail && card.recipientEmail !== buyerEmail) {
    await sendEmail(buyerEmail, `Kopia: ${mail.subject}`, mail.html, mail.text);
  }
}

/**
 * Takes the gift card part of a paid order from the card's balance. If the
 * balance was spent elsewhere in the meantime, the order is flagged for the
 * admin instead of silently giving the discount away.
 */
async function takeFromGiftCard(order: Order) {
  if (!order.giftCard) return;
  if (!(await redeemGiftCard(order.giftCard.code, order.giftCard.amount))) {
    await updateOrder(order.id, (o) => ({ ...o, giftCardIssue: true }));
  }
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
      total: li.amount_subtotal,
      discount: li.amount_discount,
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
    // A gift card is applied as a one-off Stripe coupon; it's shown as its own line, not as a discount.
    discount: session.metadata?.giftCardCode ? 0 : (session.total_details?.amount_discount ?? 0),
    discountCode: session.metadata?.giftCardCode ? null : await discountCode(session),
    giftCard: session.metadata?.giftCardCode
      ? { code: session.metadata.giftCardCode, amount: Number(session.metadata.giftCardAmount) || 0 }
      : null,
    shipping: session.shipping_cost?.amount_total ?? 0,
    total: session.amount_total ?? 0,
    currency: session.currency ?? "sek",
    paymentMethod: await paymentMethodType(session),
    // Set by our checkout route for signed-in customers (a Cognito sub).
    customerSub: /^[0-9a-f-]{36}$/.test(session.client_reference_id ?? "") ? session.client_reference_id : null,
    delivery: await deliveryFrom(session),
    history: [],
  };
}

/** The delivery method and pickup point our checkout route put in the session metadata. */
async function deliveryFrom(session: Stripe.Checkout.Session): Promise<Order["delivery"]> {
  const id = session.metadata?.shippingMethod;
  if (!isShippingMethodId(id)) return null;
  const method = shippingMethod(id);
  const pickupPoint = session.metadata?.pickupPointId ? await pickupPoints.get(session.metadata.pickupPointId) : null;
  return { method: method.id, label: method.label, pickupPoint };
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

/** The promotion code the customer typed in Checkout, if any. */
async function discountCode(session: Stripe.Checkout.Session): Promise<string | null> {
  const promo = session.discounts?.find((d) => d.promotion_code)?.promotion_code;
  if (!promo) return null;
  if (typeof promo !== "string") return promo.code;
  try {
    return (await stripe().promotionCodes.retrieve(promo)).code;
  } catch {
    return null;
  }
}
