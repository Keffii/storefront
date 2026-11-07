import { formatRating, type RatingSummary } from "@/lib/reviews";
import { Stars } from "./Stars";
import styles from "./RatingLine.module.css";

/** "★★★★☆ 4,3 (12 recensioner)"; renders nothing until there are reviews. */
export function RatingLine({ summary, href, size = "md" }: { summary: RatingSummary; href?: string; size?: "sm" | "md" }) {
  if (summary.count === 0) return null;
  const text = `${formatRating(summary.average)} (${summary.count} ${summary.count === 1 ? "recension" : "recensioner"})`;
  const content = (
    <>
      <Stars value={summary.average} size={size === "sm" ? 12 : 14} />
      <span className={styles.text}>{text}</span>
    </>
  );
  return href ? (
    <a href={href} className={`${styles.line} ${styles[size]}`}>
      {content}
    </a>
  ) : (
    <span className={`${styles.line} ${styles[size]}`}>{content}</span>
  );
}
