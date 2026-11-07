"use client";

import { useCart } from "./CartProvider";
import styles from "./CartButton.module.css";

export function CartButton() {
  const { cart, ready, open } = useCart();
  const count = ready ? cart.itemCount : 0;
  return (
    <button
      type="button"
      className={styles.button}
      onClick={open}
      aria-label={`Varukorg, ${count} ${count === 1 ? "vara" : "varor"}`}
      aria-haspopup="dialog"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 8h14l-1.2 12H6.2L5 8Z" stroke="currentColor" strokeWidth="1.4" />
        <path d="M9 8V6.5a3 3 0 0 1 6 0V8" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      {count > 0 && (
        <span className={styles.count} aria-hidden="true">
          {count}
        </span>
      )}
    </button>
  );
}
