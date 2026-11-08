import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { site } from "@/data/products";
import { maskGiftCardCode } from "@/lib/gift-cards";
import { formatPrice } from "@/lib/format";
import { isValidReceiptToken } from "@/lib/receipt-token";
import { isDbConfigured } from "@/lib/server/config";
import { getOrder } from "@/lib/server/orders";
import { amountExclVat, vatIncluded } from "@/lib/vat";
import { PrintButton } from "./PrintButton";
import styles from "./kvitto.module.css";

export const metadata: Metadata = { title: "Kvitto", robots: { index: false } };
export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("sv-SE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Stockholm" });

/** Demo seller details, clearly marked as made up. */
const SELLER = {
  name: `${site.brandName} (demo)`,
  orgNr: "559000-0000 (påhittat)",
  address: "Exempelgatan 1, 111 22 Stockholm",
};

export default async function ReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id) || !t || !isValidReceiptToken(id, t) || !isDbConfigured()) notFound();
  const order = await getOrder(id);
  if (!order) notFound();

  const vat = vatIncluded(order.total);

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.receipt}>
        <header className={styles.head}>
          <div>
            <p className={styles.logo}>{site.brandName.toUpperCase()}</p>
            <p className={styles.seller}>
              {SELLER.name}
              <br />
              Org.nr {SELLER.orgNr}
              <br />
              {SELLER.address}
            </p>
          </div>
          <div className={styles.meta}>
            <h1 className={styles.title}>Kvitto</h1>
            <p>Order {order.id.slice(-8).toUpperCase()}</p>
            <p>{dateTime.format(new Date(order.createdAt))}</p>
            <p>Betalsätt: {order.paymentMethod === "klarna" ? "Klarna" : order.paymentMethod === "card" ? "Kort" : "–"}</p>
          </div>
        </header>

        {order.name && (
          <p className={styles.buyer}>
            <strong>Kund</strong>
            <br />
            {order.name}
            {order.email && (
              <>
                <br />
                {order.email}
              </>
            )}
          </p>
        )}

        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Artikel</th>
              <th scope="col">Antal</th>
              <th scope="col">À-pris</th>
              <th scope="col">Summa</th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l, i) => (
              <tr key={i}>
                <td>{l.name}</td>
                <td>{l.quantity}</td>
                <td>{formatPrice(l.unitAmount)}</td>
                <td>{formatPrice(l.total)}</td>
              </tr>
            ))}
            {order.discount ? (
              <tr>
                <td>Rabatt{order.discountCode ? ` (${order.discountCode})` : ""}</td>
                <td />
                <td />
                <td>−{formatPrice(order.discount)}</td>
              </tr>
            ) : null}
            {order.giftCard ? (
              <tr>
                <td>Presentkort ({maskGiftCardCode(order.giftCard.code)})</td>
                <td />
                <td />
                <td>−{formatPrice(order.giftCard.amount)}</td>
              </tr>
            ) : null}
            <tr>
              <td>Frakt</td>
              <td />
              <td />
              <td>{order.shipping ? formatPrice(order.shipping) : "0 kr"}</td>
            </tr>
          </tbody>
        </table>

        <dl className={styles.totals}>
          <div>
            <dt>Belopp exkl. moms</dt>
            <dd>{formatPrice(amountExclVat(order.total))}</dd>
          </div>
          <div>
            <dt>Moms 25 %</dt>
            <dd>{formatPrice(vat)}</dd>
          </div>
          <div className={styles.total}>
            <dt>Att betala</dt>
            <dd>{formatPrice(order.total)}</dd>
          </div>
          {order.refunds?.map((r) => (
            <div key={r.id}>
              <dt>
                Återbetalt {r.reason === "cancellation" ? "(avbruten order)" : r.returnId ? `(retur ${r.returnId})` : ""},{" "}
                {new Date(r.at).toLocaleDateString("sv-SE", { timeZone: "Europe/Stockholm" })}
              </dt>
              <dd>−{formatPrice(r.amount)}</dd>
            </div>
          ))}
        </dl>

        <p className={styles.demo}>
          Portfoliodemo: säljaren och organisationsnumret är påhittade och kvittot avser inget riktigt köp.
        </p>
      </div>
      <PrintButton />
    </div>
  );
}
