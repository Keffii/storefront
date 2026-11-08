import { NextResponse, type NextRequest } from "next/server";
import { site } from "@/data/products";
import { priceCart } from "@/lib/cart";
import { shortages } from "@/lib/inventory";
import { getLiveProducts } from "@/lib/server/catalog";
import { parseCheckoutBody, toCheckoutLineItems } from "@/lib/checkout";
import { isStripeConfigured } from "@/lib/server/config";
import { requestOrigin } from "@/lib/server/origin";
import { stripe } from "@/lib/server/stripe";

export const dynamic = "force-dynamic";

/**
 * Creates a Stripe Checkout Session. The browser only sends product and
 * variant ids with quantities; every price is recalculated here from the
 * catalogue, so a tampered request can't change what is charged.
 */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      {
        message:
          "Betalningar är inte aktiverade i demon än. Resten av butiken fungerar som vanligt.",
      },
      { status: 503 },
    );
  }

  const lines = parseCheckoutBody(await req.json().catch(() => null));
  if (!lines) return NextResponse.json({ message: "Varukorgen kunde inte läsas." }, { status: 400 });

  // Live stock, uncached: the cart in the browser may be a minute behind.
  const liveProducts = await getLiveProducts();
  const cart = priceCart(lines, liveProducts);
  const short = shortages(
    cart.lines.map((l) => ({ slug: l.slug, variantId: l.variantId, quantity: l.quantity })),
    liveProducts,
  );
  if (cart.removed.length > 0 || short.length > 0) {
    return NextResponse.json(
      { message: "Något i varukorgen har tagit slut eller finns i färre exemplar. Uppdatera sidan och försök igen." },
      { status: 409 },
    );
  }
  if (cart.lines.length === 0) {
    return NextResponse.json({ message: "Varorna i varukorgen finns inte längre i lager." }, { status: 409 });
  }

  const origin = requestOrigin(req);
  const arm = req.cookies.get("objekt_ab_buybox")?.value ?? "none";

  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      locale: "sv",
      currency: "sek",
      // Filters the methods enabled in the Stripe dashboard down to card and Klarna.
      allowed_payment_method_types: ["card", "klarna"],
      line_items: toCheckoutLineItems(cart),
      shipping_address_collection: { allowed_countries: ["SE"] },
      phone_number_collection: { enabled: false },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: cart.shipping === 0 ? "Fri frakt" : "Standardfrakt",
            fixed_amount: { amount: cart.shipping, currency: "sek" },
            delivery_estimate: {
              minimum: { unit: "business_day", value: site.deliveryDays.min },
              maximum: { unit: "business_day", value: site.deliveryDays.max + 1 },
            },
          },
        },
      ],
      metadata: { arm },
      success_url: `${origin}/tack?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?kassa=avbruten`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Stripe error", err);
    return NextResponse.json({ message: "Kassan gick inte att öppna. Försök igen om en stund." }, { status: 502 });
  }
}
