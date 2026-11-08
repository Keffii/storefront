import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { Button } from "@/components/ui/Button";
import { getAllProducts } from "@/lib/server/catalog";
import type { AnalyticsEventName } from "@/lib/analytics-events";
import { formatPrice } from "@/lib/format";
import { getAdminState } from "@/lib/server/auth";
import { isDbConfigured } from "@/lib/server/config";
import { readMetrics } from "@/lib/server/metrics";
import { listOrders } from "@/lib/server/orders";
import { listRecentReviews } from "@/lib/server/reviews";
import { markShipped, removeReview } from "./actions";
import { STATUS_LABELS } from "./status";
import styles from "./admin.module.css";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };
export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Stockholm" });

const FUNNEL: { event: AnalyticsEventName; label: string }[] = [
  { event: "product_view", label: "Produktvisningar" },
  { event: "add_to_cart", label: "Lagt i varukorgen" },
  { event: "checkout_started", label: "Gått till kassan" },
  { event: "purchase", label: "Köp" },
];

const pct = (part: number, whole: number) =>
  whole > 0 ? `${((part / whole) * 100).toLocaleString("sv-SE", { maximumFractionDigits: 1 })} %` : "–";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim().toLowerCase();
  const state = await getAdminState();
  if (state.kind === "signed-out" || state.kind === "not-configured") redirect("/admin/logga-in");

  if (state.kind === "forbidden") {
    return (
      <div className={`container ${styles.signIn}`}>
        <h1 className={styles.title}>Ingen behörighet</h1>
        <p className={styles.lead}>
          Kontot {state.email ?? ""} är inloggat men tillhör inte gruppen admin.
        </p>
        <SignOutButton />
      </div>
    );
  }

  if (!isDbConfigured()) {
    return (
      <div className={`container ${styles.page}`}>
        <h1 className={styles.title}>Admin</h1>
        <p className={styles.notice}>Databasen är inte konfigurerad i den här miljön.</p>
      </div>
    );
  }

  const products = await getAllProducts();
  const getProduct = (slug: string) => products.find((p) => p.slug === slug);
  const [orders, metrics, reviews] = await Promise.all([
    listOrders(100),
    readMetrics(30),
    listRecentReviews(products.map((p) => p.slug), 20),
  ]);

  const paid = orders.filter((o) => o.status === "paid" || o.status === "shipped");
  const revenue = paid.reduce((s, o) => s + o.total, 0);
  const toShip = orders.filter((o) => o.status === "paid").length;
  const arms = ["A", "B"].map((arm) => ({ arm, counts: metrics.byArm[arm] }));

  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.head}>
        <div>
          <p className="caption">Admin</p>
          <h1 className={styles.title}>Översikt</h1>
        </div>
        <div className={styles.user}>
          <span>{state.email}</span>
          <SignOutButton />
        </div>
      </header>

      <nav aria-label="Admin" className={styles.adminNav}>
        <Link href="/admin">Översikt</Link>
        <Link href="/admin/produkter">Produkter</Link>
        <Link href="/admin/lager">Lager</Link>
        <Link href="/admin/presentkort">Presentkort</Link>
      </nav>

      <section aria-labelledby="kpi-title">
        <h2 id="kpi-title" className="visually-hidden">
          Nyckeltal
        </h2>
        <dl className={styles.kpis}>
          <div>
            <dt>Ordrar</dt>
            <dd>{orders.length}</dd>
          </div>
          <div>
            <dt>Omsättning (betalda)</dt>
            <dd>{formatPrice(revenue)}</dd>
          </div>
          <div>
            <dt>Snittorder</dt>
            <dd>{paid.length ? formatPrice(Math.round(revenue / paid.length)) : "–"}</dd>
          </div>
          <div>
            <dt>Att skicka</dt>
            <dd>{toShip}</dd>
          </div>
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="funnel-title">
        <h2 id="funnel-title" className={styles.h2}>
          Köptratt, senaste {metrics.days} dagarna
        </h2>
        <p className={styles.note}>
          Räknas bara för besökare som godkänt statistik. Köp räknas av Stripe-webhooken.
        </p>
        <ol role="list" className={styles.funnel}>
          {FUNNEL.map((step, i) => {
            const value = metrics.totals[step.event];
            const top = metrics.totals.product_view;
            return (
              <li key={step.event}>
                <span className={styles.funnelLabel}>{step.label}</span>
                <span className={styles.funnelBar}>
                  <span style={{ width: top ? `${Math.max(2, (value / top) * 100)}%` : "0%" }} />
                </span>
                <span className={styles.funnelValue}>
                  {value}
                  {i > 0 && <small> ({pct(value, metrics.totals[FUNNEL[i - 1].event])})</small>}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="ab-title">
        <h2 id="ab-title" className={styles.h2}>
          A/B-test: köpknappen
        </h2>
        <p className={styles.note}>A: &quot;Lägg i varukorgen&quot;. B: knappen visar också totalpriset.</p>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Variant</th>
                <th scope="col">Produktvisningar</th>
                <th scope="col">Lagt i varukorgen</th>
                <th scope="col">Andel</th>
                <th scope="col">Köp</th>
              </tr>
            </thead>
            <tbody>
              {arms.map(({ arm, counts }) => (
                <tr key={arm}>
                  <th scope="row">{arm}</th>
                  <td>{counts?.product_view ?? 0}</td>
                  <td>{counts?.add_to_cart ?? 0}</td>
                  <td>{pct(counts?.add_to_cart ?? 0, counts?.product_view ?? 0)}</td>
                  <td>{counts?.purchase ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="orders-title">
        <h2 id="orders-title" className={styles.h2}>
          Ordrar
        </h2>
        <form className={styles.inlineForm} role="search">
          <label className="visually-hidden" htmlFor="order-search">
            Sök order på e-post
          </label>
          <input id="order-search" name="q" type="search" defaultValue={q} placeholder="Sök på e-post" className={styles.searchInput} />
          <Button type="submit" variant="secondary">
            Sök
          </Button>
        </form>
        {orders.length === 0 ? (
          <p className={styles.note}>Inga ordrar än. Testköp med Stripes testkort hamnar här.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Datum</th>
                  <th scope="col">Kund</th>
                  <th scope="col">Summa</th>
                  <th scope="col">Status</th>
                  <th scope="col">
                    <span className="visually-hidden">Åtgärd</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.filter((o) => !q || (o.email ?? "").toLowerCase().includes(q)).map((o) => (
                  <tr key={o.id}>
                    <th scope="row">
                      <Link href={`/admin/ordrar/${o.id}`}>{o.id.slice(-8).toUpperCase()}</Link>
                    </th>
                    <td>{dateTime.format(new Date(o.createdAt))}</td>
                    <td>
                      {o.name ?? o.email ?? "–"}
                      <br />
                      <span className={styles.note}>{o.customerSub ? "Konto" : "Gäst"}</span>
                    </td>
                    <td>{formatPrice(o.total)}</td>
                    <td>
                      <span className={`${styles.status} ${styles[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                      {o.stockIssues?.length ? <span className={`${styles.status} ${styles.failed}`}> Lagerbrist</span> : null}
                    </td>
                    <td>
                      {o.status === "paid" && (
                        <form action={markShipped}>
                          <input type="hidden" name="id" value={o.id} />
                          <Button type="submit" variant="secondary">
                            Markera skickad
                          </Button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className={styles.section} aria-labelledby="reviews-title">
        <h2 id="reviews-title" className={styles.h2}>
          Senaste recensioner
        </h2>
        {reviews.length === 0 ? (
          <p className={styles.note}>Inga recensioner än.</p>
        ) : (
          <ul role="list" className={styles.reviews}>
            {reviews.map((r) => (
              <li key={r.id}>
                <div>
                  <p>
                    <strong>{r.rating}/5</strong> · {getProduct(r.slug)?.name ?? r.slug} · {r.name} ·{" "}
                    {dateTime.format(new Date(r.createdAt))}
                  </p>
                  {r.title && <p className={styles.reviewTitle}>{r.title}</p>}
                  <p className={styles.note}>{r.body}</p>
                </div>
                <form action={removeReview}>
                  <input type="hidden" name="slug" value={r.slug} />
                  <input type="hidden" name="createdAt" value={r.createdAt} />
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="rating" value={r.rating} />
                  <Button type="submit" variant="ghost">
                    Ta bort
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
