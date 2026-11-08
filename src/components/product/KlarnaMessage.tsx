"use client";

import { useEffect, useRef, useState } from "react";
import type { Money } from "@/lib/types";
import styles from "./KlarnaMessage.module.css";

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

interface MessagingElement {
  mount(el: HTMLElement): void;
  update(options: { amount: number }): void;
  on(event: "ready", cb: () => void): void;
  destroy(): void;
}
interface StripeJs {
  elements(): { create(type: "paymentMethodMessaging", options: Record<string, unknown>): MessagingElement };
}
declare global {
  interface Window {
    Stripe?: (key: string, options?: Record<string, unknown>) => StripeJs;
  }
}

let stripeJs: Promise<StripeJs | null> | null = null;

function loadStripe(): Promise<StripeJs | null> {
  if (!PUBLISHABLE_KEY) return Promise.resolve(null);
  stripeJs ??= new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://js.stripe.com/v3/";
    script.async = true;
    script.onload = () => resolve(window.Stripe ? window.Stripe(PUBLISHABLE_KEY, { locale: "sv" }) : null);
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
  return stripeJs;
}

const INTERACTIONS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

/**
 * "Dela upp betalningen" near the price. A plain text line renders at once;
 * Stripe's payment method messaging element replaces it after the visitor's
 * first interaction, so Stripe.js never competes with the first paint or the
 * Lighthouse run. Without a publishable key the text line stays.
 */
export function KlarnaMessage({ amount }: { amount: Money }) {
  const target = useRef<HTMLDivElement>(null);
  const element = useRef<MessagingElement | null>(null);
  const [ready, setReady] = useState(false);
  const amountRef = useRef(amount);
  amountRef.current = amount;

  useEffect(() => {
    if (!PUBLISHABLE_KEY) return;
    let cancelled = false;
    const start = () => {
      INTERACTIONS.forEach((e) => window.removeEventListener(e, start));
      loadStripe().then((stripe) => {
        if (!stripe || cancelled || !target.current) return;
        const el = stripe.elements().create("paymentMethodMessaging", {
          amount: amountRef.current,
          currency: "SEK",
          countryCode: "SE",
          paymentMethodTypes: ["klarna"],
        });
        el.on("ready", () => !cancelled && setReady(true));
        el.mount(target.current);
        element.current = el;
      });
    };
    INTERACTIONS.forEach((e) => window.addEventListener(e, start, { once: true, passive: true }));
    return () => {
      cancelled = true;
      INTERACTIONS.forEach((e) => window.removeEventListener(e, start));
      element.current?.destroy();
      element.current = null;
    };
  }, []);

  useEffect(() => {
    element.current?.update({ amount });
  }, [amount]);

  return (
    <div className={styles.box}>
      {!ready && <p className={styles.fallback}>Betala direkt, om 30 dagar eller dela upp betalningen med Klarna.</p>}
      <div ref={target} className={ready ? undefined : styles.hidden} />
    </div>
  );
}
