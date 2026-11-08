import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { getAdminState } from "@/lib/server/auth";
import { isDbConfigured } from "@/lib/server/config";
import { listGiftCards } from "@/lib/server/gift-cards";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Presentkort", robots: { index: false } };
export const dynamic = "force-dynamic";

const date = new Intl.DateTimeFormat("sv-SE", { dateStyle: "medium", timeZone: "Europe/Stockholm" });

export default async function GiftCardsAdminPage() {
  const state = await getAdminState();
  if (state.kind !== "admin") redirect("/admin");
  const cards = isDbConfigured() ? await listGiftCards() : [];
  const outstanding = cards.filter((c) => new Date(c.expiresAt) > new Date()).reduce((s, c) => s + c.balance, 0);

  return (
    <div className={`container ${styles.page}`}>
      <Link href="/admin" className={styles.back}>
        ← Översikt
      </Link>
      <header className={styles.head}>
        <div>
          <p className="caption">Admin</p>
          <h1 className={styles.title}>Presentkort</h1>
        </div>
      </header>
      <p className={styles.note}>
        Utestående saldo på giltiga kort: <strong>{formatPrice(outstanding)}</strong>. Det är en skuld till kunderna tills
        korten används eller går ut.
      </p>
      {cards.length === 0 ? (
        <p className={styles.note}>Inga presentkort sålda än.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Kod</th>
                <th scope="col">Köpt</th>
                <th scope="col">Värde</th>
                <th scope="col">Saldo</th>
                <th scope="col">Giltigt till</th>
                <th scope="col">Mottagare</th>
              </tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.code}>
                  <th scope="row">{c.code}</th>
                  <td>{date.format(new Date(c.createdAt))}</td>
                  <td>{formatPrice(c.initial)}</td>
                  <td>{formatPrice(c.balance)}</td>
                  <td>{date.format(new Date(c.expiresAt))}</td>
                  <td>{c.recipientEmail ?? c.buyerEmail ?? "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
