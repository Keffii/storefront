/**
 * Cookie consent. One first-party cookie records the visitor's choice; it is
 * strictly necessary (it remembers the choice itself), so it needs no consent.
 * Analytics and the A/B test only run when the value is "all".
 */
export const CONSENT_COOKIE = "objekt_consent";
export type ConsentValue = "all" | "necessary";

const MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export function readConsent(cookieHeader?: string): ConsentValue | null {
  const source = cookieHeader ?? (typeof document !== "undefined" ? document.cookie : "");
  const match = source.match(new RegExp(`(?:^|;\\s*)${CONSENT_COOKIE}=(all|necessary)`));
  return (match?.[1] as ConsentValue | undefined) ?? null;
}

export function hasAnalyticsConsent(): boolean {
  return readConsent() === "all";
}

export function writeConsent(value: ConsentValue) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${value}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent("objekt:consent", { detail: value }));
}
