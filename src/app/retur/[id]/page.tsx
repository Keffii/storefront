import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { STATUS_LABELS } from "@/app/admin/status";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { site } from "@/data/products";
import { formatPrice } from "@/lib/format";
import {
  canStartReturn,
  RETURN_REASONS,
  RETURN_STATUS_LABELS,
  returnableQuantities,
  returnDeadline,
} from "@/lib/returns";
import { trackingLink } from "@/lib/shipping";
import { orderForReturn } from "./access";
import { ReturnForm } from "./ReturnForm";
import styles from "./retur.module.css";

export const metadata: Metadata = { title: "Retur", robots: { index: false } };
export const dynamic = "force-dynamic";

const date = new Intl.DateTimeFormat("sv-SE", { dateStyle: "long", timeZone: "Europe/Stockholm" });

export default async function ReturnPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const order = await orderForReturn(id, t);
  if (!order) notFound();

  const number = order.id.slice(-8).toUpperCase();
  const left = returnableQuantities(order);
  const deadline = returnDeadline(order);
  const open = canStartReturn(order);

  return (
    <div className={`container ${styles.page}`}>
      <p className="caption">Retur</p>
      <h1 className={styles.title}>Order {number}</h1>
      <p className={styles.lead}>
        {STATUS_LABELS[order.status]}
        {deadline && order.status === "shipped" ? ` · returnera senast ${date.format(deadline)}` : ""}
      </p>

      <OrderTimeline
        status={order.status}
        createdAt={order.createdAt}
        shippedAt={order.shippedAt}
        cancelledAt={order.cancelledAt}
        tracking={trackingLink(order.carrier, order.trackingNumber)}
        events={order.history}
      />

      {order.returns?.length ? (
        <section className={styles.section} aria-labelledby="returns-title">
          <h2 id="returns-title" className={styles.h2}>
            Dina returer
          </h2>
          {order.returns.map((r) => (
            <article key={r.id} className={styles.card}>
              <div className={styles.cardHead}>
                <strong>{r.id}</strong>
                <span className={styles.muted}>{RETURN_STATUS_LABELS[r.status]}</span>
              </div>
              <ul role="list" className={styles.items}>
                {r.items.map((i) => (
                  <li key={i.lineIndex}>
                    {i.quantity} × {order.lines[i.lineIndex]?.name}
                  </li>
                ))}
              </ul>
              <p className={styles.muted}>
                {RETURN_REASONS[r.reason]} · anmäld {date.format(new Date(r.createdAt))}
                {r.refundAmount ? ` · ${formatPrice(r.refundAmount)} återbetalt` : ""}
              </p>
            </article>
          ))}
        </section>
      ) : null}

      {open ? (
        <section className={styles.section} aria-labelledby="new-return">
          <h2 id="new-return" className={styles.h2}>
            {order.returns?.length ? "Returnera fler varor" : "Returnera varor"}
          </h2>
          <ReturnForm
            id={order.id}
            token={t}
            lines={order.lines.map((l, index) => ({ index, name: l.name, left: left[index] })).filter((l) => l.left > 0)}
          />
          <div className={styles.rules}>
            <p>
              Du har {site.returnDays} dagars öppet köp från att du fått varan. Varan ska vara oanvänd och helst ligga i
              originalförpackningen.
            </p>
            <p>
              Vi återbetalar det du betalade för varorna, till samma betalsätt. Frakten återbetalas när hela ordern returneras.
              Returfrakten är gratis.
            </p>
          </div>
        </section>
      ) : (
        !order.returns?.length && (
          <p className={styles.muted}>
            {order.status === "shipped"
              ? `Returtiden har gått ut för den här ordern. Kontakta oss om något är fel med varan.`
              : "Du kan anmäla en retur när ordern har skickats."}
          </p>
        )
      )}
    </div>
  );
}
