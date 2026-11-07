/**
 * The one entry point for analytics. Nothing is sent unless the visitor has
 * opted in through the cookie banner. Events are anonymous counters (no
 * personal data, no user id), posted to /api/events.
 */
import { hasAnalyticsConsent } from "./consent";

export type AnalyticsEvent =
  | { name: "product_view"; product: string }
  | { name: "variant_picked"; product: string; variant: string }
  | { name: "add_to_cart"; product: string; variant: string; quantity: number; value: number }
  | { name: "checkout_started"; value: number; items: number };

/** Set by the buy box A/B test so every event is reported per arm. */
let experimentArm: string | null = null;
export function setExperimentArm(arm: string | null) {
  experimentArm = arm;
}

export function track(event: AnalyticsEvent): void {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return;
  // keepalive lets the request finish even if the visitor navigates away.
  void fetch("/api/events", {
    method: "POST",
    body: JSON.stringify({ ...event, arm: experimentArm }),
    keepalive: true,
    headers: { "content-type": "application/json" },
  }).catch(() => {
    // Analytics must never break the shop.
  });
  if (process.env.NODE_ENV === "development") console.debug("[track]", event.name, event);
}
