/**
 * The one entry point for analytics. Nothing is sent unless the visitor has
 * opted in through the cookie banner. Events are anonymous counters (no
 * personal data, no user id), batched to /api/events with sendBeacon.
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
  const payload = JSON.stringify({ ...event, arm: experimentArm });
  try {
    const blob = new Blob([payload], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/events", blob)) {
      void fetch("/api/events", { method: "POST", body: payload, keepalive: true, headers: { "content-type": "application/json" } });
    }
  } catch {
    // Analytics must never break the shop.
  }
  if (process.env.NODE_ENV === "development") console.debug("[track]", event.name, event);
}
