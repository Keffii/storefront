import styles from "./OrderTimeline.module.css";

const dateTime = new Intl.DateTimeFormat("sv-SE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Stockholm" });

/** Beställd → Betald → Skickad, shared by "Mina ordrar" and guest order tracking. */
export function OrderTimeline({ status, createdAt, shippedAt }: { status: string; createdAt: string; shippedAt?: string | null }) {
  if (status === "failed") return <p className={styles.failed}>Betalningen gick inte igenom.</p>;
  const steps = [
    { label: "Beställd", done: true, at: createdAt },
    { label: "Betald", done: status === "paid" || status === "shipped", at: status === "pending_payment" ? null : createdAt },
    { label: "Skickad", done: status === "shipped", at: shippedAt ?? null },
  ];
  return (
    <ol className={styles.timeline} aria-label="Orderstatus">
      {steps.map((s) => (
        <li key={s.label} className={`${styles.step} ${s.done ? styles.done : ""}`}>
          <span>
            {s.label}
            {s.done ? "" : " (inte än)"}
          </span>
          {s.done && s.at && <span className={styles.date}>{dateTime.format(new Date(s.at))}</span>}
        </li>
      ))}
    </ol>
  );
}
