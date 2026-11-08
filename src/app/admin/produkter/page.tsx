import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getCategory, getDefaultVariant, getPriceRange } from "@/data/products";
import { formatPrice } from "@/lib/format";
import { getAdminState } from "@/lib/server/auth";
import { getAllProducts } from "@/lib/server/catalog";
import styles from "../admin.module.css";

export const metadata: Metadata = { title: "Produkter", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ProductsAdminPage() {
  const state = await getAdminState();
  if (state.kind !== "admin") redirect("/admin");
  const products = await getAllProducts();

  return (
    <div className={`container ${styles.page}`}>
      <Link href="/admin" className={styles.back}>
        ← Översikt
      </Link>
      <header className={styles.head}>
        <div>
          <p className="caption">Admin</p>
          <h1 className={styles.title}>Produkter</h1>
        </div>
        <Button href="/admin/produkter/ny">Ny produkt</Button>
      </header>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Produkt</th>
              <th scope="col">Kategori</th>
              <th scope="col">Pris</th>
              <th scope="col">Varianter</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const { min, max } = getPriceRange(p);
              const img = getDefaultVariant(p).images[0];
              return (
                <tr key={p.slug}>
                  <th scope="row">
                    <Link href={`/admin/produkter/${p.slug}`} className={styles.productCell}>
                      {img && <Image src={img.src} alt="" width={40} height={40} sizes="40px" />}
                      {p.name}
                    </Link>
                  </th>
                  <td>{getCategory(p.category)?.name ?? p.category}</td>
                  <td>{min === max ? formatPrice(min) : `${formatPrice(min)}–${formatPrice(max)}`}</td>
                  <td>{p.variants.length}</td>
                  <td>
                    <span className={`${styles.status} ${p.published === false ? styles.pending_payment : styles.shipped}`}>
                      {p.published === false ? "Dold" : "Publicerad"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
