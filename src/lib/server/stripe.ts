import "server-only";
import Stripe from "stripe";
import { stripeConfig } from "./config";

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!stripeConfig.secretKey) throw new Error("Stripe is not configured");
  if (stripeConfig.secretKey.startsWith("sk_live_")) {
    // This is a portfolio demo: refuse live keys outright.
    throw new Error("Live Stripe keys are not allowed in this demo");
  }
  client ??= new Stripe(stripeConfig.secretKey, { appInfo: { name: "objekt-storefront-demo" } });
  return client;
}
