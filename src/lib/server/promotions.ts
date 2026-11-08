import "server-only";
import { WELCOME_CODE, WELCOME_PERCENT } from "@/lib/promotions";
import { stripe } from "./stripe";

let ensured: Promise<void> | null = null;

/**
 * Makes sure the demo welcome code exists in the connected Stripe account, so
 * a fresh test account works without manual dashboard setup. Runs once per
 * server instance; ids are fixed, so a race between instances is harmless.
 */
export function ensureWelcomeCode(): Promise<void> {
  ensured ??= (async () => {
    const existing = await stripe().promotionCodes.list({ code: WELCOME_CODE, limit: 1 });
    if (existing.data.length > 0) return;
    const couponId = `objekt-valkommen-${WELCOME_PERCENT}`;
    try {
      await stripe().coupons.retrieve(couponId);
    } catch {
      await stripe().coupons.create({ id: couponId, percent_off: WELCOME_PERCENT, duration: "once", name: `Välkommen ${WELCOME_PERCENT} %` });
    }
    await stripe().promotionCodes.create({
      promotion: { type: "coupon", coupon: couponId },
      code: WELCOME_CODE,
    });
  })().catch((err) => {
    ensured = null; // try again on the next checkout
    console.warn("[promotions] could not ensure welcome code:", (err as Error).message);
  });
  return ensured;
}
