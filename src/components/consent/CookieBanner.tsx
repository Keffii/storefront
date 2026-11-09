"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { readConsent, writeConsent, type ConsentValue } from "@/lib/consent";
import { clearExperimentCookie } from "@/lib/experiment";
import styles from "./CookieBanner.module.css";

export const OPEN_CONSENT_EVENT = "objekt:open-consent";

/**
 * Cookie consent. "Godkänn" and "Avböj" are the same size, and "Hantera
 * inställningar" shows the two categories. Nothing beyond the necessary
 * cookie is set before the visitor accepts statistics. The footer link
 * reopens it.
 */
export function CookieBanner() {
  const [open, setOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const [statistics, setStatistics] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (readConsent() === null) setOpen(true);
    const reopen = () => {
      setStatistics(readConsent() === "all");
      setManaging(false);
      setOpen(true);
    };
    window.addEventListener(OPEN_CONSENT_EVENT, reopen);
    return () => window.removeEventListener(OPEN_CONSENT_EVENT, reopen);
  }, []);

  function choose(value: ConsentValue) {
    writeConsent(value);
    if (value === "necessary") clearExperimentCookie();
    setOpen(false);
    setManaging(false);
  }

  if (!open) return null;

  return (
    <section className={styles.banner} aria-labelledby="cookie-title" aria-describedby="cookie-text">
      <div className={styles.inner}>
        <h2 id="cookie-title" className={styles.title}>
          Cookies
        </h2>
        <p id="cookie-text" className={styles.text}>
          Vi använder en nödvändig cookie för att komma ihåg ditt val. Med ditt godkännande räknar vi också hur butiken
          används och testar förbättringar av köpknappen. Vi visar inga annonser och delar inget med andra. Läs mer i vår{" "}
          <Link href="/integritetspolicy">integritetspolicy</Link>.
        </p>

        {managing && (
          <div id={panelId} className={styles.panel}>
            <div className={styles.option}>
              <div>
                <p className={styles.optionTitle}>Nödvändiga</p>
                <p className={styles.optionText}>Kommer ihåg ditt val och håller varukorgen och inloggningen igång.</p>
              </div>
              <span className={styles.always}>Alltid på</span>
            </div>
            <label className={styles.option}>
              <div>
                <span className={styles.optionTitle}>Statistik och test</span>
                <span className={styles.optionText}>
                  Anonyma räknare för sidvisningar, varukorg och köp, och ett test av två varianter av köpknappen.
                </span>
              </div>
              <input
                type="checkbox"
                role="switch"
                checked={statistics}
                onChange={(e) => setStatistics(e.target.checked)}
                className={styles.switch}
              />
            </label>
          </div>
        )}

        <div className={styles.actions}>
          {managing ? (
            <button type="button" className={styles.manage} onClick={() => choose(statistics ? "all" : "necessary")}>
              Spara mina val
            </button>
          ) : (
            <button
              type="button"
              className={styles.manage}
              aria-expanded={false}
              aria-controls={panelId}
              onClick={() => {
                setStatistics(readConsent() === "all");
                setManaging(true);
              }}
            >
              Hantera inställningar
            </button>
          )}
          <button type="button" className={styles.choice} onClick={() => choose("all")}>
            Godkänn
          </button>
          <button type="button" className={styles.choice} onClick={() => choose("necessary")}>
            Avböj
          </button>
        </div>
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
