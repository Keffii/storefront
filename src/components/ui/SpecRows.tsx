import type { Spec } from "@/lib/types";
import styles from "./SpecRows.module.css";

export function SpecRows({ specs }: { specs: Spec[] }) {
  return (
    <dl className={styles.list}>
      {specs.map((s) => (
        <div key={s.label} className={styles.row}>
          <dt className={styles.label}>{s.label}</dt>
          <dd className={styles.value}>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}
