"use client";

import { useActionState } from "react";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { Button } from "@/components/ui/Button";
import { trackOrderAction } from "./actions";
import styles from "./spara.module.css";

export function TrackOrderForm() {
  const [state, action, pending] = useActionState(trackOrderAction, null);
  return (
    <div className={styles.wrap}>
      <form action={action} className={styles.form}>
        <label className={styles.field}>
          <span>Ordernummer</span>
          <input name="number" autoComplete="off" placeholder="T.ex. 7HQ2K9XA" maxLength={12} required />
        </label>
        <label className={styles.field}>
          <span>E-post</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <Button type="submit" disabled={pending}>
          {pending ? "Söker …" : "Visa status"}
        </Button>
      </form>

      <div aria-live="polite">
        {state && !state.ok && <p className={styles.error}>{state.message}</p>}
        {state?.ok && (
          <section className={styles.result} aria-label={`Order ${state.order.number}`}>
            <h2 className={styles.h2}>
              Order {state.order.number}: {state.order.statusLabel}
            </h2>
            <OrderTimeline status={state.order.status} createdAt={state.order.createdAt} shippedAt={state.order.shippedAt} />
            <ul className={styles.items}>
              {state.order.items.map((i, n) => (
                <li key={n}>
                  {i.quantity} × {i.name}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
