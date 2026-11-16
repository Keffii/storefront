import "server-only";
import Stripe from "stripe";
import { stripeConfig } from "./config";

let client: Stripe | null = null;

/** True for test-mode secret and restricted keys; live keys of any kind are refused. */
export const isStripeTestKey = (key: string) => /^(sk|rk)_test_/.test(key);

export function stripe(): Stripe {
  if (!stripeConfig.secretKey) throw new Error("Stripe is not configured");
  if (!isStripeTestKey(stripeConfig.secretKey)) {
    // This is a portfolio demo: only test-mode secret or restricted keys.
    throw new Error("Only Stripe test keys (sk_test_ or rk_test_) are allowed in this demo");
  }
  client ??= new Stripe(stripeConfig.secretKey, { appInfo: { name: "objekt-storefront-demo" } });
  return client;
}

/**
 * Stripe Checkout in the shop's look, set per session so it doesn't depend
 * on the dashboard: white page, graphite buttons, square corners and the
 * shop's name instead of the account name.
 */
export const checkoutBranding = {
  display_name: "Objekt",
  background_color: "#ffffff",
  button_color: "#1f1f1f",
  border_style: "rectangular",
  font_family: "inter",
} satisfies Stripe.Checkout.SessionCreateParams.BrandingSettings;
