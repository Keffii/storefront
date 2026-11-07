import { formatRating } from "@/lib/reviews";
import styles from "./Stars.module.css";

/** Read-only star display; partial stars via a clipped overlay. */
export function Stars({ value, size = 14, label }: { value: number; size?: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  return (
    <span
      className={styles.stars}
      style={{ "--size": `${size}px` } as React.CSSProperties}
      role="img"
      aria-label={label ?? `${formatRating(value)} av 5 stjärnor`}
    >
      <span className={styles.base} aria-hidden="true">
        ★★★★★
      </span>
      <span className={styles.fill} style={{ width: `${pct}%` }} aria-hidden="true">
        ★★★★★
      </span>
    </span>
  );
}
