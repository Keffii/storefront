"use client";

import { useEffect, useState } from "react";
import { site } from "@/data/products";
import {
  estimateDelivery,
  formatCountdown,
  formatDeliveryRange,
  type DeliveryEstimate as Estimate,
} from "@/lib/delivery";
import styles from "./DeliveryEstimate.module.css";

const config = {
  cutoffHour: site.shippingCutoffHour,
  minDays: site.deliveryDays.min,
  maxDays: site.deliveryDays.max,
};

/**
 * Computed in the browser from the visitor's clock (in Stockholm time), so a
 * statically generated page still shows today's estimate. Rendered after
 * mount with a fixed-height placeholder to avoid layout shift.
 */
export function DeliveryEstimate({ soldOut }: { soldOut?: boolean }) {
  const [estimate, setEstimate] = useState<Estimate | null>(null);

  useEffect(() => {
    const update = () => setEstimate(estimateDelivery(new Date(), config));
    update();
    const id = window.setInterval(update, 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (soldOut) return null;

  return (
    <div className={styles.box} aria-live="polite">
      <svg className={styles.icon} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M2 6h12v10H2zM14 9h4l3 3v4h-7" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="6" cy="17.5" r="1.8" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="17" cy="17.5" r="1.8" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      {estimate ? (
        <p className={styles.text}>
          <span>
            Leverans <strong>{formatDeliveryRange(estimate)}</strong>
          </span>
          <span className={styles.sub}>
            {estimate.shipsToday && estimate.minutesToCutoff !== null
              ? `Beställ inom ${formatCountdown(estimate.minutesToCutoff)} så skickas den i dag`
              : `Beställ före kl. ${site.shippingCutoffHour} på vardagar så skickas den samma dag`}
          </span>
        </p>
      ) : (
        <p className={styles.text}>
          <span>Leverans inom {site.deliveryDays.min}–{site.deliveryDays.max} vardagar</span>
          <span className={styles.sub}>Beräknar leveransdatum …</span>
        </p>
      )}
    </div>
  );
}
