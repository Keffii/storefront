import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { products } from "@/data/products";
import { getAdminState } from "@/lib/server/auth";
import { getLiveProducts } from "@/lib/server/inventory";
import { LOW_STOCK_THRESHOLD, variantLabel } from "@/lib/variants";
import { updateStock } from "../actions";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Lager", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function StockPage() {
  const state = await getAdminState();
  if (state.kind !== "admin") redirect("/admin");

  const live = await getLiveProducts();

  return (
    <div className={`container ${styles.page}`}>
      <Link href="/admin" className={styles.back}>
        ← Översikt
      </Link>
      <header className={styles.head}>
        <div>
          <p className="caption">Admin</p>
          <h1 className={styles.title}>Lager</h1>
        </div>
      </header>
      <p className={styles.note}>
        Startsaldot kommer från produktdatan. När en variant säljs eller ändras här sparas saldot i databasen, och
        butiken visar det nya saldot inom en minut.
      </p>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Variant</th>
              <th scope="col">SKU</th>
              <th scope="col">I lager</th>
              <th scope="col">
                <span className="visually-hidden">Ändra</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {live.flatMap((p) =>
              p.variants.map((v) => {
                const base = products.find((x) => x.slug === p.slug)!;
                return (
                  <tr key={`${p.slug}:${v.id}`}>
                    <th scope="row">
                      <Link href={`/produkter/${p.slug}?variant=${v.id}`}>{variantLabel(base, v)}</Link>
                    </th>
                    <td>{v.sku}</td>
                    <td>
                      <span
                        className={`${styles.status} ${v.stock === 0 ? styles.failed : v.stock <= LOW_STOCK_THRESHOLD ? styles.paid : styles.shipped}`}
                      >
                        {v.stock === 0 ? "Slut" : `${v.stock} st`}
                      </span>
                    </td>
                    <td>
                      <form action={updateStock} className={styles.inlineForm}>
                        <input type="hidden" name="slug" value={p.slug} />
                        <input type="hidden" name="variantId" value={v.id} />
                        <label className="visually-hidden" htmlFor={`qty-${p.slug}-${v.id}`}>
                          Nytt saldo för {variantLabel(base, v)}
                        </label>
                        <input
                          id={`qty-${p.slug}-${v.id}`}
                          name="qty"
                          type="number"
                          min={0}
                          max={9999}
                          defaultValue={v.stock}
                          className={styles.qtyInput}
                        />
                        <Button type="submit" variant="secondary">
                          Spara
                        </Button>
                      </form>
                    </td>
                  </tr>
                );
              }),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
