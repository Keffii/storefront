"use client";

/**
 * Buy box A/B test. Only visitors who accepted analytics cookies are
 * enrolled; everyone else sees arm A and is never counted. The arm is kept
 * in a first-party cookie so it's sticky across visits and the checkout
 * route can attach it to the Stripe session (purchases are counted per arm).
 */
import { useEffect, useState } from "react";
import type { ExperimentArm } from "./analytics-events";
import { setExperimentArm } from "./analytics";
import { hasAnalyticsConsent } from "./consent";

export const AB_COOKIE = "objekt_ab_buybox";
const MAX_AGE = 60 * 60 * 24 * 90;

function readArm(): ExperimentArm | null {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${AB_COOKIE}=(A|B)`));
  return (m?.[1] as ExperimentArm | undefined) ?? null;
}

function enrol(): ExperimentArm {
  const existing = readArm();
  if (existing) return existing;
  const arm: ExperimentArm = crypto.getRandomValues(new Uint8Array(1))[0] < 128 ? "A" : "B";
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${AB_COOKIE}=${arm}; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`;
  return arm;
}

export function clearExperimentCookie() {
  document.cookie = `${AB_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function useBuyBoxArm(): ExperimentArm {
  const [arm, setArm] = useState<ExperimentArm>("A");
  useEffect(() => {
    const apply = () => {
      if (hasAnalyticsConsent()) {
        const a = enrol();
        setArm(a);
        setExperimentArm(a);
      } else {
        setArm("A");
        setExperimentArm(null);
      }
    };
    apply();
    window.addEventListener("objekt:consent", apply);
    return () => window.removeEventListener("objekt:consent", apply);
  }, []);
  return arm;
}
