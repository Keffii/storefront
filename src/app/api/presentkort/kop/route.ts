import { NextResponse, type NextRequest } from "next/server";
import { GIFT_CARD_AMOUNTS } from "@/lib/gift-cards";
import { formatPrice } from "@/lib/format";
import { getSession } from "@/lib/server/auth";
import { isStripeConfigured } from "@/lib/server/config";
import { requestOrigin } from "@/lib/server/origin";
import { clientKey, rateLimit } from "@/lib/server/ratelimit";
import { checkoutBranding, stripe } from "@/lib/server/stripe";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Starts Stripe Checkout for a digital gift card. No shipping, no stock. */
export async function POST(req: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ message: "Betalningar är inte aktiverade i demon än." }, { status: 503 });
  }
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const amount = Number(body?.amount);
  if (!GIFT_CARD_AMOUNTS.includes(amount)) return NextResponse.json({ message: "Välj ett belopp." }, { status: 400 });
  const recipientEmail = typeof body?.recipientEmail === "string" ? body.recipientEmail.trim() : "";
  if (recipientEmail && (!EMAIL.test(recipientEmail) || recipientEmail.length > 120)) {
    return NextResponse.json({ message: "Mottagarens e-postadress ser inte rätt ut." }, { status: 422 });
  }
  const recipientName = typeof body?.recipientName === "string" ? body.recipientName.trim().slice(0, 60) : "";
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 300) : "";

  if (!(await rateLimit("giftcard", clientKey(req), 10, 3600))) {
    return NextResponse.json({ message: "För många försök. Försök igen om en stund." }, { status: 429 });
  }

  const origin = requestOrigin(req);
  // Signed-in customers don't have to type their email again.
  const account = await getSession().catch(() => null);
  try {
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      ...(account ? { customer_email: account.email } : {}),
      locale: "sv",
      branding_settings: checkoutBranding,
      currency: "sek",
      allowed_payment_method_types: ["card", "klarna"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "sek",
            unit_amount: amount,
            product_data: { name: `Presentkort ${formatPrice(amount)}`, metadata: { slug: "presentkort", variantId: String(amount) } },
          },
        },
      ],
      // Stripe metadata values are limited to 500 characters.
      metadata: { kind: "giftcard", amount: String(amount), recipientEmail, recipientName, message },
      success_url: `${origin}/presentkort/tack?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/presentkort`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[giftcard] Stripe error", err);
    return NextResponse.json({ message: "Kassan gick inte att öppna. Försök igen om en stund." }, { status: 502 });
  }
}
