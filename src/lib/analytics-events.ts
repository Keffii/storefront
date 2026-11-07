/** Event names shared by the browser tracker and the server counters. */
export type AnalyticsEventName = "product_view" | "variant_picked" | "add_to_cart" | "checkout_started" | "purchase";

export const EVENT_NAMES: AnalyticsEventName[] = [
  "product_view",
  "variant_picked",
  "add_to_cart",
  "checkout_started",
  "purchase",
];

/** Events the browser may report. Purchases are counted by the Stripe webhook. */
export const CLIENT_EVENTS: AnalyticsEventName[] = ["product_view", "variant_picked", "add_to_cart", "checkout_started"];

export const EXPERIMENT_ARMS = ["A", "B"] as const;
export type ExperimentArm = (typeof EXPERIMENT_ARMS)[number];
