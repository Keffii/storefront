"use client";

import { useEffect } from "react";
import { hasAnalyticsConsent } from "@/lib/consent";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

function gtag(...args: unknown[]) {
  window.dataLayer ??= [];
  // gtag's consent commands must be pushed as an arguments-like object.
  window.dataLayer.push(args);
}

function grantAndLoad() {
  if (!GTM_ID || document.getElementById("gtm-script")) return;
  gtag("consent", "update", {
    ad_storage: "granted",
    ad_user_data: "granted",
    ad_personalization: "granted",
    analytics_storage: "granted",
  });
  window.dataLayer!.push({ "gtm.start": Date.now(), event: "gtm.js" });
  const s = document.createElement("script");
  s.id = "gtm-script";
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
  document.head.appendChild(s);
}

/**
 * Google Tag Manager with Consent Mode v2, only when NEXT_PUBLIC_GTM_ID is
 * set. Consent defaults to denied; the container loads only after the
 * visitor accepts statistics in the banner. Without an id this does nothing.
 */
export function TagManager() {
  useEffect(() => {
    if (!GTM_ID) return;
    gtag("consent", "default", {
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      wait_for_update: 500,
    });
    if (hasAnalyticsConsent()) grantAndLoad();
    const onConsent = (e: Event) => {
      if ((e as CustomEvent<string>).detail === "all") grantAndLoad();
    };
    window.addEventListener("objekt:consent", onConsent);
    return () => window.removeEventListener("objekt:consent", onConsent);
  }, []);
  return null;
}
