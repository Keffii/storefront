"use client";

import { useEffect, useState } from "react";
import { estimateDelivery, formatDeliveryRange } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { isPostalCode, type PickupPoint } from "@/lib/pickup-points";
import { SHIPPING_METHODS, shippingFee } from "@/lib/shipping";
import type { Money } from "@/lib/types";
import { useDelivery } from "./deliveryStore";
import styles from "./DeliveryPicker.module.css";

/** Delivery method (and pickup point) chosen in the cart, before payment. */
export function DeliveryPicker({ amount }: { amount: Money }) {
  const [choice, setChoice] = useDelivery();
  const [points, setPoints] = useState<PickupPoint[] | null>(null);
  const [postal, setPostal] = useState(choice.postalCode);
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => setNow(new Date()), []);

  // Load the nearest points for the saved postal code (or central Stockholm).
  useEffect(() => {
    if (choice.method !== "ombud") return;
    const ctrl = new AbortController();
    fetch(`/api/ombud?postnummer=${encodeURIComponent(choice.postalCode)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: { points: PickupPoint[] }) => {
        setPoints(d.points);
        if (!d.points.some((p) => p.id === choice.pickupPointId) && d.points[0]) setChoice({ pickupPointId: d.points[0].id });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [choice.method, choice.postalCode, choice.pickupPointId, setChoice]);

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>Leveranssätt</legend>
      <div className={styles.methods}>
        {SHIPPING_METHODS.map((m) => {
          const fee = shippingFee(m, amount);
          const estimate = now ? formatDeliveryRange(estimateDelivery(now, m)) : null;
          return (
            <label key={m.id} className={styles.method}>
              <input
                type="radio"
                name="delivery-method"
                value={m.id}
                checked={choice.method === m.id}
                onChange={() => setChoice({ method: m.id })}
                className={styles.radio}
              />
              <span className={styles.methodBody}>
                <span className={styles.methodTop}>
                  <span className={styles.methodName}>{m.label}</span>
                  <span>{fee === 0 ? "Fri" : formatPrice(fee)}</span>
                </span>
                <span className={styles.methodSub}>{m.description}</span>
                {estimate && <span className={styles.methodSub}>Leverans {estimate}</span>}
              </span>
            </label>
          );
        })}
      </div>

      {choice.method === "ombud" && (
        <div className={styles.pickup}>
          <form
            className={styles.postal}
            onSubmit={(e) => {
              e.preventDefault();
              if (isPostalCode(postal)) setChoice({ postalCode: postal.replace(/\D/g, "") });
            }}
          >
            <label htmlFor="pickup-postal" className={styles.postalLabel}>
              Postnummer
            </label>
            <input
              id="pickup-postal"
              inputMode="numeric"
              autoComplete="postal-code"
              maxLength={6}
              placeholder="116 46"
              value={postal}
              onChange={(e) => setPostal(e.target.value)}
              className={styles.input}
            />
            <button type="submit" className={styles.search}>
              Visa ombud
            </button>
          </form>
          {points && (
            <div role="radiogroup" aria-label="Ombud" className={styles.points}>
              {points.map((p) => (
                <label key={p.id} className={styles.point}>
                  <input
                    type="radio"
                    name="pickup-point"
                    value={p.id}
                    checked={choice.pickupPointId === p.id}
                    onChange={() => setChoice({ pickupPointId: p.id })}
                    className={styles.radio}
                  />
                  <span className={styles.methodBody}>
                    <span className={styles.methodName}>{p.name}</span>
                    <span className={styles.methodSub}>
                      {p.street}, {p.postalCode} {p.city} · {p.hours}
                    </span>
                  </span>
                </label>
              ))}
              <p className={styles.demo}>Ombuden är påhittade demodata.</p>
            </div>
          )}
        </div>
      )}
    </fieldset>
  );
}
