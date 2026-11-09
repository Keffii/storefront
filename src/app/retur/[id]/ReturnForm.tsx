"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { RETURN_REASONS } from "@/lib/returns";
import { requestReturn } from "./actions";
import styles from "./retur.module.css";

export interface ReturnableLine {
  index: number;
  name: string;
  left: number;
}

export function ReturnForm({ id, token, lines }: { id: string; token?: string; lines: ReturnableLine[] }) {
  const [state, action, pending] = useActionState(requestReturn, null);

  if (state?.ok) {
    return (
      <div className={styles.done} role="status">
        <p className={styles.doneTitle}>Returen är anmäld: {state.returnId}</p>
        <p>
          Vi har mejlat instruktioner. Packa varorna, lägg en lapp med returnumret i paketet och lämna det hos ett PostNord-ombud.
          Vi återbetalar när paketet har kommit fram.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="id" value={id} />
      {token && <input type="hidden" name="t" value={token} />}
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Vad vill du returnera?</legend>
        {lines.map((l) => (
          <label key={l.index} className={styles.lineRow}>
            <span>{l.name}</span>
            <select name={`qty-${l.index}`} aria-label={`Antal att returnera: ${l.name}`} defaultValue={lines.length === 1 ? String(l.left) : "0"} className={styles.select}>
              {Array.from({ length: l.left + 1 }, (_, n) => (
                <option key={n} value={n}>
                  {n} st
                </option>
              ))}
            </select>
          </label>
        ))}
      </fieldset>
      <label className={styles.field}>
        <span>Anledning</span>
        <select name="reason" required defaultValue="" className={styles.select}>
          <option value="" disabled>
            Välj anledning
          </option>
          {Object.entries(RETURN_REASONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className={styles.field}>
        <span>Kommentar (valfritt)</span>
        <textarea name="comment" rows={3} maxLength={500} className={styles.textarea} />
      </label>
      {state && !state.ok && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Skickar …" : "Anmäl retur"}
      </Button>
    </form>
  );
}
