"use client";

import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/format";
import { MIN_CARD_PAYMENT } from "@/lib/gift-cards";
import { useDelivery } from "./deliveryStore";
import styles from "./GiftCardField.module.css";

type Check = { status: "idle" | "checking" } | { status: "ok"; balance: number } | { status: "error"; message: string };

async function checkCode(code: string): Promise<Check> {
  try {
    const res = await fetch("/api/presentkort/saldo", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = (await res.json().catch(() => ({}))) as { balance?: number; message?: string };
    return res.ok && typeof data.balance === "number"
      ? { status: "ok", balance: data.balance }
      : { status: "error", message: data.message ?? "Koden kunde inte kontrolleras." };
  } catch {
    return { status: "error", message: "Ingen anslutning. Försök igen." };
  }
}

/** Gift card code in the cart. Reports the balance up so the totals can show the deduction. */
export function GiftCardField({ onBalance }: { onBalance: (balance: number) => void }) {
  const [choice, setChoice] = useDelivery();
  const [open, setOpen] = useState(Boolean(choice.giftCardCode));
  const [input, setInput] = useState("");
  const [check, setCheck] = useState<Check>({ status: "idle" });

  // Re-check a saved code: the balance may have changed since.
  useEffect(() => {
    if (!choice.giftCardCode) {
      onBalance(0);
      return;
    }
    let cancelled = false;
    setCheck({ status: "checking" });
    checkCode(choice.giftCardCode).then((c) => {
      if (cancelled) return;
      setCheck(c);
      onBalance(c.status === "ok" ? c.balance : 0);
      if (c.status === "error") setChoice({ giftCardCode: null });
    });
    return () => {
      cancelled = true;
    };
  }, [choice.giftCardCode, onBalance, setChoice]);

  if (choice.giftCardCode && check.status === "ok") {
    return (
      <div className={styles.applied}>
        <p>
          Presentkort <strong>{choice.giftCardCode}</strong>, saldo {formatPrice(check.balance)}
        </p>
        <p className={styles.note}>
          Minst {formatPrice(MIN_CARD_PAYMENT)} betalas med kort eller Klarna. Rabattkoder kan inte kombineras med presentkort.
        </p>
        <button type="button" className={styles.link} onClick={() => setChoice({ giftCardCode: null })}>
          Ta bort presentkortet
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" className={styles.link} onClick={() => setOpen(true)}>
        Har du ett presentkort?
      </button>
    );
  }

  return (
    <form
      className={styles.form}
      onSubmit={async (e) => {
        e.preventDefault();
        setCheck({ status: "checking" });
        const c = await checkCode(input);
        setCheck(c);
        if (c.status === "ok") setChoice({ giftCardCode: input.trim().toUpperCase() });
      }}
    >
      <label htmlFor="gift-card-code" className={styles.label}>
        Presentkortskod
      </label>
      <input
        id="gift-card-code"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="OBJ-XXXX-XXXX"
        autoComplete="off"
        autoCapitalize="characters"
        maxLength={16}
        className={styles.input}
        aria-describedby={check.status === "error" ? "gift-card-error" : undefined}
      />
      <button type="submit" className={styles.apply} disabled={check.status === "checking"}>
        {check.status === "checking" ? "Kollar …" : "Använd"}
      </button>
      {check.status === "error" && (
        <p id="gift-card-error" className={styles.error} role="alert">
          {check.message}
        </p>
      )}
    </form>
  );
}
