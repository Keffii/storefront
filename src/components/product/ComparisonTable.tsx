import type { Comparison } from "@/lib/types";
import styles from "./ComparisonTable.module.css";

export function ComparisonTable({ comparison, caption }: { comparison: Comparison; caption: string }) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <td />
            {comparison.columns.map((c) => (
              <th key={c.label} scope="col" className={c.highlight ? styles.highlight : undefined}>
                <span className="caption">{c.label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {comparison.rows.map((row) => (
            <tr key={row.label}>
              <th scope="row">{row.label}</th>
              {row.values.map((v, i) => (
                <td key={i} className={comparison.columns[i]?.highlight ? styles.highlight : undefined}>
                  {typeof v === "boolean" ? (
                    v ? (
                      <>
                        <span aria-hidden="true" className={styles.yes}>
                          ✓
                        </span>
                        <span className="visually-hidden">Ja</span>
                      </>
                    ) : (
                      <>
                        <span aria-hidden="true" className={styles.no}>
                          –
                        </span>
                        <span className="visually-hidden">Nej</span>
                      </>
                    )
                  ) : (
                    v
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
