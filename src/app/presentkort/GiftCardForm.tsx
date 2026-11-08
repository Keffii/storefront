"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/format";
import { GIFT_CARD_AMOUNTS } from "@/lib/gift-cards";
import styles from "./presentkort.module.css";

export function GiftCardForm() {
  const [amount, setAmount] = useState(GIFT_CARD_AMOUNTS[1]);
  const [toSomeone, setToSomeone] = useState(false);
  const [state, setState] = useState<{ status: "idle" | "loading" } | { status: "error"; message: string }>({ status: "idle" });

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/presentkort/kop", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          amount,
          recipientEmail: toSomeone ? form.get("recipientEmail") : "",
          recipientName: toSomeone ? form.get("recipientName") : "",
          message: toSomeone ? form.get("message") : "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { url?: string; message?: string };
      if (res.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setState({ status: "error", message: data.message ?? "Kassan gick inte att öppna. Försök igen om en stund." });
    } catch {
      setState({ status: "error", message: "Ingen anslutning. Försök igen." });
    }
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Belopp</legend>
        <div className={styles.amounts}>
          {GIFT_CARD_AMOUNTS.map((a) => (
            <label key={a} className={styles.amount}>
              <input
                type="radio"
                name="amount"
                value={a}
                checked={amount === a}
                onChange={() => setAmount(a)}
                className={styles.radio}
              />
              <span>{formatPrice(a)}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className={styles.check}>
        <input type="checkbox" checked={toSomeone} onChange={(e) => setToSomeone(e.target.checked)} />
        <span>Skicka direkt till mottagaren</span>
      </label>

      {toSomeone && (
        <div className={styles.recipient}>
          <label className={styles.field}>
            <span>Mottagarens namn</span>
            <input name="recipientName" maxLength={60} autoComplete="off" />
          </label>
          <label className={styles.field}>
            <span>Mottagarens e-post</span>
            <input name="recipientEmail" type="email" required maxLength={120} autoComplete="off" />
          </label>
          <label className={styles.field}>
            <span>Hälsning (valfritt)</span>
            <textarea name="message" rows={3} maxLength={300} />
          </label>
          <p className={styles.note}>Du får en kopia till e-postadressen du anger i kassan.</p>
        </div>
      )}

      {state.status === "error" && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      <Button type="submit" size="lg" disabled={state.status === "loading"}>
        {state.status === "loading" ? "Öppnar kassan …" : `Köp presentkort, ${formatPrice(amount)}`}
      </Button>
      <p className={styles.note}>Kort eller Klarna · Testläge, inga riktiga betalningar</p>
    </form>
  );
}
