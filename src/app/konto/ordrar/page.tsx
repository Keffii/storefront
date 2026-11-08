import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { STATUS_LABELS } from "@/app/admin/status";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/format";
import { getSession } from "@/lib/server/auth";
import { isDbConfigured } from "@/lib/server/config";
import { findClaimableOrders, listCustomerOrders } from "@/lib/server/customers";
import { claimGuestOrdersAction } from "../actions";
import { AccountHeader } from "../AccountNav";
import styles from "../konto.module.css";

export const metadata: Metadata = { title: "Mina ordrar", robots: { index: false } };
export const dynamic = "force-dynamic";

const date = new Intl.DateTimeFormat("sv-SE", { dateStyle: "long", timeZone: "Europe/Stockholm" });

export default async function OrdersPage() {
  const session = await getSession();
  if (!session) redirect("/konto/logga-in?till=/konto/ordrar");
  const [orders, claimable] = isDbConfigured()
    ? await Promise.all([listCustomerOrders(session.sub), findClaimableOrders(session)])
    : [[], []];

  return (
    <div className={`container ${styles.page}`}>
      <AccountHeader email={session.email} current="ordrar" />
      <h1 className={styles.h1}>Mina ordrar</h1>

      {claimable.length > 0 && (
        <form action={claimGuestOrdersAction} className={styles.claim}>
          <p>
            Vi hittade {claimable.length === 1 ? "en tidigare beställning" : `${claimable.length} tidigare beställningar`} som
            gjordes utan konto med {session.email}. Vill du lägga till {claimable.length === 1 ? "den" : "dem"} här?
          </p>
          <ul role="list">
            {claimable.map((o) => (
              <li key={o.id}>
                <label>
                  <input type="checkbox" name="order" value={o.id} defaultChecked />
                  Order {o.id.slice(-8).toUpperCase()}, {date.format(new Date(o.createdAt))}, {formatPrice(o.total)}
                </label>
              </li>
            ))}
          </ul>
          <div>
            <Button type="submit" variant="secondary">
              Lägg till i mitt konto
            </Button>
          </div>
        </form>
      )}

      {orders.length === 0 ? (
        <div className={styles.empty}>
          <p>Du har inga ordrar än. Beställningar du gör när du är inloggad hamnar här.</p>
          <Button href="/kollektion" variant="secondary">
            Till butiken
          </Button>
        </div>
      ) : (
        <ul role="list" className={styles.orders}>
          {orders.map((o) => {
            const items = o.lines.reduce((s, l) => s + l.quantity, 0);
            return (
              <li key={o.id}>
                <Link href={`/konto/ordrar/${o.id}`} className={styles.orderRow}>
                  <span>
                    <span className={styles.orderNumber}>Order {o.id.slice(-8).toUpperCase()}</span>
                    <br />
                    <span className={styles.orderMeta}>
                      {date.format(new Date(o.createdAt))} · {items} {items === 1 ? "vara" : "varor"} · {formatPrice(o.total)}
                    </span>
                  </span>
                  <span className={`${styles.badge} ${styles[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
