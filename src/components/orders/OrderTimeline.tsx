import { EVENT_LABELS, type OrderEvent } from "@/lib/returns";
import styles from "./OrderTimeline.module.css";

const dateTime = new Intl.DateTimeFormat("sv-SE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Stockholm" });

export interface TimelineProps {
  status: string;
  createdAt: string;
  shippedAt?: string | null;
  cancelledAt?: string | null;
  tracking?: { label: string; number: string; url: string } | null;
  /** Events after shipping (returns, refunds), oldest first. */
  events?: OrderEvent[];
}

const AFTER_SHIPPING = new Set(["return_requested", "return_received", "return_rejected", "refunded"]);

/**
 * Beställd → Betald → Skickad (or Avbruten), then the order's later history.
 * Shared by "Mina ordrar", guest order tracking and the return page.
 */
export function OrderTimeline({ status, createdAt, shippedAt, cancelledAt, tracking, events = [] }: TimelineProps) {
  if (status === "failed") return <p className={styles.failed}>Betalningen gick inte igenom.</p>;
  const paid = status !== "pending_payment";
  const last =
    status === "cancelled"
      ? { label: "Avbruten", done: true, at: cancelledAt ?? null }
      : { label: "Skickad", done: status === "shipped", at: shippedAt ?? null };
  const steps = [{ label: "Beställd", done: true, at: createdAt }, { label: "Betald", done: paid, at: paid ? createdAt : null }, last];
  const later = events.filter((e) => AFTER_SHIPPING.has(e.type));

  return (
    <div className={styles.wrap}>
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
      {tracking && status === "shipped" && (
        <p className={styles.tracking}>
          {tracking.label}, kollinummer {tracking.number}.{" "}
          <a href={tracking.url} target="_blank" rel="noopener noreferrer">
            Spåra paketet<span className="visually-hidden"> (öppnas i ny flik)</span>
          </a>
        </p>
      )}
      {later.length > 0 && (
        <ul role="list" className={styles.events} aria-label="Händelser efter leverans">
          {later.map((e, i) => (
            <li key={i}>
              <span>
                {EVENT_LABELS[e.type]}
                {e.note ? `: ${e.note}` : ""}
              </span>
              <span className={styles.date}>{dateTime.format(new Date(e.at))}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
