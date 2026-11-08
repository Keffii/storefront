import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { STATUS_LABELS } from "@/app/admin/status";
import { OrderTimeline } from "@/components/orders/OrderTimeline";
import { Button } from "@/components/ui/Button";
import { canViewOrder, reorderLines } from "@/lib/accounts";
import { formatPrice } from "@/lib/format";
import { receiptPath, returnPath } from "@/lib/receipt-token";
import { canStartReturn, refundedSoFar } from "@/lib/returns";
import { trackingLink } from "@/lib/shipping";
import { getSession } from "@/lib/server/auth";
import { getCatalogWithStock } from "@/lib/server/catalog";
import { isDbConfigured } from "@/lib/server/config";
import { getOrder } from "@/lib/server/orders";
import { vatIncluded } from "@/lib/vat";
import { AccountHeader } from "../../AccountNav";
import { ReorderButton } from "./ReorderButton";
import styles from "../../konto.module.css";

export const metadata: Metadata = { title: "Order", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect(`/konto/logga-in?till=/konto/ordrar/${encodeURIComponent(id)}`);
  const order = /^cs_(test|live)_[A-Za-z0-9]+$/.test(id) && isDbConfigured() ? await getOrder(id) : null;
  // 404 (not 403) when it isn't theirs, so order ids can't be probed.
  if (!order || !canViewOrder(order, session.sub)) notFound();

  const catalog = await getCatalogWithStock();
  const reorder = reorderLines(order, catalog);
  const imageFor = (slug: string, variantId: string) =>
    catalog.find((p) => p.slug === slug)?.variants.find((v) => v.id === variantId)?.images[0];

  const refunded = refundedSoFar(order);
  const showReturn = canStartReturn(order) || (order.returns?.length ?? 0) > 0;

  return (
    <div className={`container ${styles.page}`}>
      <AccountHeader email={session.email} current="ordrar" />
      <Link href="/konto/ordrar" className={styles.muted}>
        ← Mina ordrar
      </Link>
      <div className={styles.actions}>
        <h1 className={styles.h1}>Order {order.id.slice(-8).toUpperCase()}</h1>
        <span className={`${styles.badge} ${styles[order.status]}`}>{STATUS_LABELS[order.status]}</span>
      </div>

      <OrderTimeline
        status={order.status}
        createdAt={order.createdAt}
        shippedAt={order.shippedAt}
        cancelledAt={order.cancelledAt}
        tracking={trackingLink(order.carrier, order.trackingNumber)}
        events={order.history}
      />

      <div className={styles.detailGrid}>
        <section className={styles.card} aria-labelledby="order-lines">
          <h2 id="order-lines" className="caption">
            Varor
          </h2>
          <ul role="list" className={styles.lines}>
            {order.lines.map((l, i) => {
              const img = imageFor(l.slug, l.variantId);
              return (
                <li key={i} className={styles.line}>
                  {img ? <Image src={img.src} alt="" width={56} height={56} sizes="56px" /> : <span />}
                  <span>
                    {l.quantity} ×{" "}
                    {l.slug ? <Link href={`/produkter/${l.slug}?variant=${l.variantId}`}>{l.name}</Link> : l.name}
                  </span>
                  <span>{formatPrice(l.total)}</span>
                </li>
              );
            })}
          </ul>
          <dl className={styles.totals}>
            <div>
              <dt>Frakt</dt>
              <dd>{order.shipping ? formatPrice(order.shipping) : "Fri"}</dd>
            </div>
            <div className={styles.total}>
              <dt>Totalt</dt>
              <dd>{formatPrice(order.total)}</dd>
            </div>
            {refunded > 0 && (
              <div>
                <dt>Återbetalt</dt>
                <dd>−{formatPrice(refunded)}</dd>
              </div>
            )}
            <div>
              <dt>Varav moms (25 %)</dt>
              <dd>{formatPrice(vatIncluded(order.total))}</dd>
            </div>
          </dl>
          <div className={styles.actions}>
            <ReorderButton lines={reorder.lines} unavailable={reorder.unavailable} />
            {order.status !== "pending_payment" && order.status !== "failed" && (
              <Button href={receiptPath(order.id)} variant="ghost">
                Visa kvitto
              </Button>
            )}
            {showReturn && (
              <Button href={returnPath(order.id)} variant="ghost">
                {order.returns?.length ? "Visa retur" : "Returnera varor"}
              </Button>
            )}
          </div>
        </section>

        <section className={styles.card} aria-labelledby="order-delivery">
          <h2 id="order-delivery" className="caption">
            Leverans och betalning
          </h2>
          {order.delivery && (
            <p className={styles.muted}>
              {order.delivery.label}
              {order.delivery.pickupPoint && (
                <>
                  : {order.delivery.pickupPoint.name}, {order.delivery.pickupPoint.street}, {order.delivery.pickupPoint.postalCode}{" "}
                  {order.delivery.pickupPoint.city}
                </>
              )}
            </p>
          )}
          {order.address ? (
            <address className={styles.muted} style={{ fontStyle: "normal" }}>
              {order.name}
              <br />
              {order.address.line1}
              {order.address.line2 && (
                <>
                  <br />
                  {order.address.line2}
                </>
              )}
              <br />
              {order.address.postalCode} {order.address.city}
            </address>
          ) : (
            <p className={styles.muted}>Ingen adress sparad.</p>
          )}
          <p className={styles.muted}>
            Betalsätt: {order.paymentMethod === "klarna" ? "Klarna" : order.paymentMethod === "card" ? "Kort" : "–"}
          </p>
        </section>
      </div>
    </div>
  );
}
