import { formatPrice } from "@/lib/format";
import type { Money } from "@/lib/types";
import styles from "./Price.module.css";

interface PriceProps {
  amount: Money;
  /** "från" for products whose variants differ in price. */
  from?: boolean;
  /**
   * The price before a real, current saving (e.g. a bundle discount).
   * Never use this for invented "was" prices.
   */
  before?: Money;
  size?: "sm" | "md" | "lg";
}

export function Price({ amount, from, before, size = "md" }: PriceProps) {
  const saving = before !== undefined && before > amount;
  return (
    <span className={`${styles.price} ${styles[size]}`}>
      {from && <span className={styles.from}>från </span>}
      <span className={saving ? styles.sale : undefined}>{formatPrice(amount)}</span>
      {saving && (
        <>
          {" "}
          <s className={styles.before}>
            <span className="visually-hidden">Ordinarie pris </span>
            {formatPrice(before)}
          </s>
        </>
      )}
    </span>
  );
}
