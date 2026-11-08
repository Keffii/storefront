import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/format";
import {
  canCancel,
  EVENT_LABELS,
  RETURN_REASONS,
  RETURN_STATUS_LABELS,
  refundedSoFar,
  suggestedRefund,
} from "@/lib/returns";
import { CARRIERS, trackingLink } from "@/lib/shipping";
import { getAdminState } from "@/lib/server/auth";
import { getOrder } from "@/lib/server/orders";
import { cancelOrder, markShipped, markUnshipped, receiveReturn, refundReturn, rejectReturn } from "../../actions";
import { STATUS_LABELS } from "../../status";
import styles from "../../admin.module.css";

export const metadata: Metadata = { title: "Order", robots: { index: false } };
export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("sv-SE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Stockholm" });
const kronor = (ore: number) => (ore / 100).toFixed(2).replace(/\.00$/, "");

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const state = await getAdminState();
  if (state.kind !== "admin") redirect("/admin");

  const { id } = await params;
  const order = /^cs_(test|live)_[A-Za-z0-9]+$/.test(id) ? await getOrder(id) : null;
  if (!order) notFound();

  const refunded = refundedSoFar(order);
  const track = trackingLink(order.carrier, order.trackingNumber);
  const pickup = order.delivery?.pickupPoint;

  return (
    <div className={`container ${styles.page}`}>
      <Link href="/admin" className={styles.back}>
        ← Alla ordrar
      </Link>
      <header className={styles.head}>
        <div>
          <p className="caption">Order {order.id.slice(-8).toUpperCase()}</p>
          <h1 className={styles.title}>{order.name ?? order.email ?? "Okänd kund"}</h1>
        </div>
        <span className={`${styles.status} ${styles[order.status]}`}>{STATUS_LABELS[order.status]}</span>
      </header>

      {order.giftCardIssue ? (
        <p className={styles.warning} role="alert">
          Presentkortets saldo räckte inte när ordern betalades. Kunden har fått {formatPrice(order.giftCard?.amount ?? 0)} i
          avdrag som inte drogs från kortet. Kontakta kunden innan du skickar.
        </p>
      ) : null}

      {order.stockIssues?.length ? (
        <p className={styles.warning} role="alert">
          Lagret räckte inte för {order.stockIssues.length === 1 ? "en variant" : `${order.stockIssues.length} varianter`} när
          ordern betalades ({order.stockIssues.join(", ")}). Kontakta kunden eller fyll på lagret innan du skickar.
        </p>
      ) : null}

      <div className={styles.detailGrid}>
        <div className={styles.column}>
          <section className={styles.card} aria-labelledby="lines-title">
            <h2 id="lines-title" className="caption">
              Varor
            </h2>
            <ul role="list" className={styles.lines}>
              {order.lines.map((l, i) => (
                <li key={i}>
                  <span>
                    {l.quantity} × {l.slug ? <Link href={`/produkter/${l.slug}?variant=${l.variantId}`}>{l.name}</Link> : l.name}
                  </span>
                  <span>{formatPrice(l.total)}</span>
                </li>
              ))}
              {order.discount ? (
                <li>
                  <span>Rabatt{order.discountCode ? ` (${order.discountCode})` : ""}</span>
                  <span>−{formatPrice(order.discount)}</span>
                </li>
              ) : null}
              {order.giftCard ? (
                <li>
                  <span>Presentkort ({order.giftCard.code})</span>
                  <span>−{formatPrice(order.giftCard.amount)}</span>
                </li>
              ) : null}
              <li>
                <span>Frakt{order.delivery ? ` (${order.delivery.label})` : ""}</span>
                <span>{order.shipping ? formatPrice(order.shipping) : "Fri"}</span>
              </li>
              <li className={styles.totalLine}>
                <span>Totalt</span>
                <span>{formatPrice(order.total)}</span>
              </li>
              {refunded > 0 && (
                <li>
                  <span>Återbetalt</span>
                  <span>−{formatPrice(refunded)}</span>
                </li>
              )}
            </ul>
          </section>

          {order.returns?.length ? (
            <section className={styles.card} aria-labelledby="returns-title">
              <h2 id="returns-title" className="caption">
                Returer
              </h2>
              {order.returns.map((r) => (
                <article key={r.id} className={styles.returnItem}>
                  <div className={styles.returnHead}>
                    <strong>{r.id}</strong>
                    <span className={styles.note}>{RETURN_STATUS_LABELS[r.status]}</span>
                  </div>
                  <ul role="list" className={styles.lines}>
                    {r.items.map((i) => (
                      <li key={i.lineIndex}>
                        <span>
                          {i.quantity} × {order.lines[i.lineIndex]?.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className={styles.note}>
                    {RETURN_REASONS[r.reason]}
                    {r.comment ? `: ”${r.comment}”` : ""} · anmäld {dateTime.format(new Date(r.createdAt))}
                    {r.refundAmount ? ` · återbetalt ${formatPrice(r.refundAmount)}` : ""}
                  </p>
                  {r.status === "requested" && (
                    <div className={styles.actionsRow}>
                      <form action={receiveReturn}>
                        <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="returnId" value={r.id} />
                        <Button type="submit">Markera mottagen</Button>
                      </form>
                      <form action={rejectReturn}>
                        <input type="hidden" name="id" value={order.id} />
                        <input type="hidden" name="returnId" value={r.id} />
                        <Button type="submit" variant="ghost">
                          Avslå
                        </Button>
                      </form>
                    </div>
                  )}
                  {r.status === "received" && (
                    <form action={refundReturn} className={styles.refundForm}>
                      <input type="hidden" name="id" value={order.id} />
                      <input type="hidden" name="returnId" value={r.id} />
                      <label className={styles.field}>
                        <span>Belopp att återbetala (kr)</span>
                        <input
                          name="amount"
                          inputMode="decimal"
                          defaultValue={kronor(suggestedRefund(order, r))}
                          className={styles.qtyInput}
                          required
                        />
                      </label>
                      <Button type="submit">Återbetala via Stripe</Button>
                      <p className={styles.note}>
                        Förslaget är varornas pris efter rabatt. Frakten ingår bara när hela ordern returneras. Sänk beloppet för en
                        delvis återbetalning, till exempel om en vara kom tillbaka skadad.
                      </p>
                    </form>
                  )}
                </article>
              ))}
            </section>
          ) : null}

          {order.history?.length ? (
            <section className={styles.card} aria-labelledby="history-title">
              <h2 id="history-title" className="caption">
                Historik
              </h2>
              <ul role="list" className={styles.lines}>
                <li>
                  <span>Lagd</span>
                  <span className={styles.note}>{dateTime.format(new Date(order.createdAt))}</span>
                </li>
                {order.history.map((e, i) => (
                  <li key={i}>
                    <span>
                      {EVENT_LABELS[e.type]}
                      {e.note ? `: ${e.note}` : ""}
                    </span>
                    <span className={styles.note}>{dateTime.format(new Date(e.at))}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        <section className={styles.card} aria-labelledby="customer-title">
          <h2 id="customer-title" className="caption">
            Kund och leverans
          </h2>
          <dl className={styles.facts}>
            <div>
              <dt>E-post</dt>
              <dd>{order.email ?? "–"}</dd>
            </div>
            <div>
              <dt>Leveranssätt</dt>
              <dd>
                {order.delivery?.label ?? "Standard"}
                {pickup && (
                  <>
                    <br />
                    {pickup.name}, {pickup.street}, {pickup.postalCode} {pickup.city}
                  </>
                )}
              </dd>
            </div>
            <div>
              <dt>Adress</dt>
              <dd>
                {order.address
                  ? [order.address.line1, order.address.line2, `${order.address.postalCode ?? ""} ${order.address.city ?? ""}`]
                      .filter(Boolean)
                      .join(", ")
                  : "–"}
              </dd>
            </div>
            <div>
              <dt>Betalsätt</dt>
              <dd>{order.paymentMethod === "klarna" ? "Klarna" : order.paymentMethod === "card" ? "Kort" : "–"}</dd>
            </div>
            <div>
              <dt>Lagd</dt>
              <dd>{dateTime.format(new Date(order.createdAt))}</dd>
            </div>
            {order.shippedAt && (
              <div>
                <dt>Skickad</dt>
                <dd>
                  {dateTime.format(new Date(order.shippedAt))}
                  {track && (
                    <>
                      <br />
                      <a href={track.url} target="_blank" rel="noopener noreferrer">
                        {track.label} {track.number}
                      </a>
                    </>
                  )}
                </dd>
              </div>
            )}
          </dl>

          {order.status === "paid" && (
            <form action={markShipped} className={styles.shipForm}>
              <input type="hidden" name="id" value={order.id} />
              <label className={styles.field}>
                <span>Transportör</span>
                <select name="carrier" className={styles.select} defaultValue={order.delivery?.method === "hem" ? "budbee" : "postnord"}>
                  {Object.entries(CARRIERS).map(([value, c]) => (
                    <option key={value} value={value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Kollinummer</span>
                <input name="trackingNumber" className={styles.searchInput} required minLength={6} maxLength={40} />
              </label>
              <Button type="submit" fullWidth>
                Markera som skickad
              </Button>
            </form>
          )}
          {order.status === "shipped" && !order.returns?.length && (
            <form action={markUnshipped}>
              <input type="hidden" name="id" value={order.id} />
              <Button type="submit" variant="ghost">
                Ångra: markera som ej skickad
              </Button>
            </form>
          )}
          {canCancel(order) && (
            <form action={cancelOrder} className={styles.dangerForm}>
              <input type="hidden" name="id" value={order.id} />
              <label className={styles.check}>
                <input type="checkbox" required />
                <span>
                  Avbryt ordern. Kunden får tillbaka {formatPrice(order.total - refunded)} och varorna läggs tillbaka i lager.
                </span>
              </label>
              <Button type="submit" variant="secondary">
                Avbryt och återbetala
              </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
