"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { readConsent, writeConsent, type ConsentValue } from "@/lib/consent";
import { clearExperimentCookie } from "@/lib/experiment";
import styles from "./CookieBanner.module.css";

export const OPEN_CONSENT_EVENT = "objekt:open-consent";

/**
 * Shown until the visitor chooses. Both choices are equally prominent, and
 * nothing is tracked before "Godkänn" is clicked. The footer link reopens it.
 */
export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (readConsent() === null) setOpen(true);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  function choose(value: ConsentValue) {
    writeConsent(value);
    if (value === "necessary") clearExperimentCookie();
    setOpen(false);
  }

  if (!open) return null;

  return (
    <section className={styles.banner} aria-labelledby="cookie-title" aria-describedby="cookie-text">
      <div className={styles.text}>
        <h2 id="cookie-title" className="caption">
          Cookies
        </h2>
        <p id="cookie-text">
          Vi vill räkna anonymt hur besökare använder butiken (sidvisningar, tillägg i varukorgen, köp) och testa
          två varianter av köpknappen. Inga personuppgifter sparas och inget delas med annonsnätverk. Varukorgen
          fungerar oavsett vad du väljer.
        </p>
      </div>
      <div className={styles.actions}>
        <Button variant="secondary" onClick={() => choose("necessary")}>
          Endast nödvändiga
        </Button>
        <Button onClick={() => choose("all")}>Godkänn statistik</Button>
      </div>
    </section>
  );
}

export function CookieSettingsLink({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}>
      Cookie-inställningar
    </button>
  );
}
