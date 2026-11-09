import { NextResponse, type NextRequest } from "next/server";
import { priceCart } from "@/lib/cart";
import { shortages } from "@/lib/inventory";
import { getSession } from "@/lib/server/auth";
import { getLiveProducts } from "@/lib/server/catalog";
import { getProfile, saveProfile } from "@/lib/server/customers";
import { parseCheckoutBody, parseDelivery, toCheckoutLineItems } from "@/lib/checkout";
import { pickupPoints } from "@/lib/pickup-points";
import { shippingMethod } from "@/lib/shipping";
import { isDbConfigured, isStripeConfigured } from "@/lib/server/config";
import { giftCardReduction, maskGiftCardCode, normaliseGiftCardCode } from "@/lib/gift-cards";
import { getGiftCard, isUsable } from "@/lib/server/gift-cards";
import { requestOrigin } from "@/lib/server/origin";
import { ensureWelcomeCode } from "@/lib/server/promotions";
import { checkoutBranding, stripe } from "@/lib/server/stripe";

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

  const body: unknown = await req.json().catch(() => null);
  const lines = parseCheckoutBody(body);
  const delivery = parseDelivery(body);
  if (!lines || !delivery) return NextResponse.json({ message: "Varukorgen kunde inte läsas." }, { status: 400 });
  const method = shippingMethod(delivery.method);
  const pickupPoint = method.id === "ombud" && delivery.pickupPointId ? await pickupPoints.get(delivery.pickupPointId) : null;
  if (method.id === "ombud" && !pickupPoint) {
    return NextResponse.json({ message: "Välj ett ombud i varukorgen innan du går till kassan." }, { status: 400 });
  }

  // Live stock, uncached: the cart in the browser may be a minute behind.
  const liveProducts = await getLiveProducts();
  const cart = priceCart(lines, liveProducts, method.id);

  // Gift card: checked here against the stored balance, never trusted from the browser.
  const giftCardInput = (body as { giftCardCode?: unknown } | null)?.giftCardCode;
  const giftCardCode = typeof giftCardInput === "string" && giftCardInput ? normaliseGiftCardCode(giftCardInput) : null;
  const giftCard = giftCardCode && isDbConfigured() ? await getGiftCard(giftCardCode) : null;
  if (giftCardInput && (!giftCard || !isUsable(giftCard))) {
    return NextResponse.json({ message: "Presentkortet går inte att använda. Ta bort det i varukorgen och försök igen." }, { status: 400 });
  }
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
    const [customer] = await Promise.all([checkoutCustomer(), giftCard ? null : ensureWelcomeCode()]);
    const giftCardAmount = giftCard ? giftCardReduction(giftCard.balance, cart.total) : 0;
    // A gift card becomes a one-off coupon for exactly this session. Stripe
    // can't combine it with promotion codes, so those are off when it's used.
    const giftCoupon = giftCardAmount
      ? await stripe().coupons.create({
          amount_off: giftCardAmount,
          currency: "sek",
          duration: "once",
          max_redemptions: 1,
          name: `Presentkort ${maskGiftCardCode(giftCard!.code)}`,
          redeem_by: Math.floor(Date.now() / 1000) + 24 * 3600,
          metadata: { giftCardCode: giftCard!.code },
        })
      : null;
    const session = await stripe().checkout.sessions.create({
      ...customer,
      mode: "payment",
      locale: "sv",
      branding_settings: checkoutBranding,
      currency: "sek",
      // The shop takes card and Klarna, whatever else the Stripe dashboard enables.
      allowed_payment_method_types: ["card", "klarna"],
      ...(giftCoupon ? { discounts: [{ coupon: giftCoupon.id }] } : { allow_promotion_codes: true }),
      line_items: toCheckoutLineItems(cart),
      shipping_address_collection: { allowed_countries: ["SE"] },
      phone_number_collection: { enabled: false },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: pickupPoint ? `${method.label}: ${pickupPoint.name}` : method.label,
            fixed_amount: { amount: cart.shipping, currency: "sek" },
            delivery_estimate: {
              minimum: { unit: "business_day", value: method.minDays },
              maximum: { unit: "business_day", value: method.maxDays + 1 },
            },
          },
        },
      ],
      metadata: {
        arm,
        shippingMethod: method.id,
        pickupPointId: pickupPoint?.id ?? "",
        ...(giftCoupon ? { giftCardCode: giftCard!.code, giftCardAmount: String(giftCardAmount) } : {}),
      },
      success_url: `${origin}/tack?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?kassa=avbruten`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Stripe error", err);
    return NextResponse.json({ message: "Kassan gick inte att öppna. Försök igen om en stund." }, { status: 502 });
  }
}

/**
 * Signed-in customers: the order is linked to their account through
 * client_reference_id (set here on the server, never from the browser), and
 * their saved name and address prefill Stripe Checkout through a Stripe
 * Customer. Guests get none of this and check out exactly as before.
 */
async function checkoutCustomer(): Promise<
  { client_reference_id: string; customer: string } | { client_reference_id: string; customer_email: string } | Record<string, never>
> {
  const account = await getSession();
  if (!account) return {};
  try {
    const profile = await getProfile(account.sub);
    const a = profile.address;
    const shipping = a.line1 && a.postalCode && a.city
      ? { name: profile.name || account.email, address: { line1: a.line1, line2: a.line2 || undefined, postal_code: a.postalCode, city: a.city, country: "SE" } }
      : undefined;
    let customerId = profile.stripeCustomerId;
    if (customerId) {
      await stripe().customers.update(customerId, { email: account.email, name: profile.name || undefined, shipping });
    } else {
      const created = await stripe().customers.create({
        email: account.email,
        name: profile.name || undefined,
        shipping,
        metadata: { cognitoSub: account.sub },
      });
      customerId = created.id;
      await saveProfile(account.sub, { ...profile, stripeCustomerId: customerId });
    }
    return { client_reference_id: account.sub, customer: customerId };
  } catch (err) {
    console.warn("[checkout] customer prefill failed:", (err as Error).message);
    return { client_reference_id: account.sub, customer_email: account.email };
  }
}
