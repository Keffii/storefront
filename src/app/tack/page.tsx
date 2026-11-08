import type { Metadata } from "next";
import type Stripe from "stripe";
import { Button } from "@/components/ui/Button";
import { site } from "@/data/products";
import { formatPrice } from "@/lib/format";
import { isStripeConfigured } from "@/lib/server/config";
import { stripe } from "@/lib/server/stripe";
import { receiptPath } from "@/lib/receipt-token";
import { vatIncluded } from "@/lib/vat";
import { ClearCart } from "./ClearCart";
import { PurchaseEvent } from "./PurchaseEvent";
import { NewsletterForm } from "@/components/newsletter/NewsletterForm";
import { getCatalog } from "@/lib/server/catalog";
import styles from "./tack.module.css";

export const metadata: Metadata = {
  title: "Tack för din beställning",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

async function loadSession(id: string | undefined): Promise<Stripe.Checkout.Session | null> {
  if (!id || !isStripeConfigured() || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return null;
  try {
    return await stripe().checkout.sessions.retrieve(id, { expand: ["line_items.data.price.product"] });
  } catch {
    return null;
  }
}

export default async function ThankYouPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const session = await loadSession((await searchParams).session_id);

  if (!session) {
    return (
      <div className={`container ${styles.page}`}>
        <p className="caption">Beställning</p>
        <h1 className={styles.title}>Vi hittade ingen beställning</h1>
        <p className={styles.lead}>Länken har gått ut eller är ofullständig. Din varukorg finns kvar.</p>
        <Button href="/kollektion">Fortsätt handla</Button>
      </div>
    );
  }

  const paid = session.payment_status === "paid";
  const catalog = await getCatalog();
  const shipping = session.collected_information?.shipping_details;
  const orderNumber = session.id.slice(-8).toUpperCase();

  return (
    <div className={`container ${styles.page}`}>
      <ClearCart />
      {paid && (
        <PurchaseEvent
          id={session.id}
          value={session.amount_total ?? 0}
          shipping={session.shipping_cost?.amount_total ?? 0}
          items={(session.line_items?.data ?? []).map((li) => {
            const meta = (li.price?.product as Stripe.Product | undefined)?.metadata ?? {};
            const variant = catalog.find((p) => p.slug === meta.slug)?.variants.find((v) => v.id === meta.variantId);
            return {
              item_id: variant?.sku ?? meta.slug ?? li.id,
              item_name: li.description ?? "",
              price: (li.price?.unit_amount ?? 0) / 100,
              quantity: li.quantity ?? 1,
            };
          })}
        />
      )}
      <p className="caption">Order {orderNumber}</p>
      <h1 className={styles.title}>{paid ? "Tack för din beställning!" : "Vi väntar på betalningen"}</h1>
      <p className={styles.lead}>
        {paid
          ? `Vi har tagit emot din beställning${session.customer_details?.email ? ` (${session.customer_details.email})` : ""}. Beställningar före kl. ${site.shippingCutoffHour} på vardagar skickas samma dag.`
          : "Betalningen behandlas. Du får en bekräftelse så snart den är klar."}
      </p>
      <p className={styles.demo}>
        Det här är en portfoliodemo: ordern sparas i databasen och syns i adminvyn, men inget skickas och inga
        pengar dras.
      </p>

      <div className={styles.grid}>
        <section aria-labelledby="summary-title" className={styles.card}>
          <h2 id="summary-title" className="caption">
            Sammanfattning
          </h2>
          <ul role="list" className={styles.lines}>
            {session.line_items?.data.map((li) => (
              <li key={li.id}>
                <span>
                  {li.quantity} × {li.description}
                </span>
                <span>{formatPrice(li.amount_total)}</span>
              </li>
            ))}
          </ul>
          <dl className={styles.totals}>
            <div>
              <dt>Frakt</dt>
              <dd>{session.shipping_cost?.amount_total ? formatPrice(session.shipping_cost.amount_total) : "Fri"}</dd>
            </div>
            <div className={styles.total}>
              <dt>Totalt</dt>
              <dd>{formatPrice(session.amount_total ?? 0)}</dd>
            </div>
            <div>
              <dt>Varav moms (25 %)</dt>
              <dd>{formatPrice(vatIncluded(session.amount_total ?? 0))}</dd>
            </div>
          </dl>
        </section>

        {shipping?.address && (
          <section aria-labelledby="address-title" className={styles.card}>
            <h2 id="address-title" className="caption">
              Leveransadress
            </h2>
            <address className={styles.address}>
              {shipping.name}
              <br />
              {shipping.address.line1}
              {shipping.address.line2 && (
                <>
                  <br />
                  {shipping.address.line2}
                </>
              )}
              <br />
              {shipping.address.postal_code} {shipping.address.city}
            </address>
          </section>
        )}
      </div>

      <div className={styles.actions}>
        {paid && (
          <Button href={receiptPath(session.id)} variant="secondary">
            Visa kvitto
          </Button>
        )}
        <Button href="/kollektion" variant="ghost">
          Fortsätt handla
        </Button>
      </div>

      {paid && (
        <section className={styles.card} aria-label="Nyhetsbrev">
          <NewsletterForm source="purchase" />
        </section>
      )}
    </div>
  );
}
