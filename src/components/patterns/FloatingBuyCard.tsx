import type { ReactNode } from "react";
import styles from "./FloatingBuyCard.module.css";

/**
 * The buy box shell: a white card with a hairline border and soft shadow
 * that sticks beside the gallery on wide screens and sits inline on phones.
 */
export function FloatingBuyCard({ children, label = "Köp" }: { children: ReactNode; label?: string }) {
  return (
    <aside className={styles.card} aria-label={label}>
      {children}
    </aside>
  );
}
