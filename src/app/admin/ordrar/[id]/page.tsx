import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/format";
import { getAdminState } from "@/lib/server/auth";
import { getOrder } from "@/lib/server/orders";
import { markShipped, markUnshipped } from "../../actions";
import { STATUS_LABELS } from "../../status";
import styles from "../../admin.module.css";

export const metadata: Metadata = { title: "Order", robots: { index: false } };
export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("sv-SE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Stockholm" });

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const state = await getAdminState();
  if (state.kind !== "admin") redirect("/admin");

  const { id } = await params;
  const order = /^cs_(test|live)_[A-Za-z0-9]+$/.test(id) ? await getOrder(id) : null;
  if (!order) notFound();

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

      <div className={styles.detailGrid}>
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
            <li>
              <span>Frakt</span>
              <span>{order.shipping ? formatPrice(order.shipping) : "Fri"}</span>
            </li>
            <li className={styles.totalLine}>
              <span>Totalt</span>
              <span>{formatPrice(order.total)}</span>
            </li>
          </ul>
        </section>

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
                <dd>{dateTime.format(new Date(order.shippedAt))}</dd>
              </div>
            )}
          </dl>
          {order.status === "paid" && (
            <form action={markShipped}>
              <input type="hidden" name="id" value={order.id} />
              <Button type="submit" fullWidth>
                Markera som skickad
              </Button>
            </form>
          )}
          {order.status === "shipped" && (
            <form action={markUnshipped}>
              <input type="hidden" name="id" value={order.id} />
              <Button type="submit" variant="ghost">
                Ångra: markera som ej skickad
              </Button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
