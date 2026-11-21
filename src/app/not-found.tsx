import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid } from "@/components/patterns/ProductGrid";
import { Button } from "@/components/ui/Button";
import { categories } from "@/data/products";
import { categoryHref } from "@/lib/catalog";
import { getCatalogWithStock } from "@/lib/server/catalog";
import styles from "./not-found.module.css";

export const metadata: Metadata = { title: "Sidan finns inte" };

/** Shown for unknown addresses and missing products, with a 404 status. */
export default async function NotFound() {
  const featured = (await getCatalogWithStock()).filter((p) => p.featured).slice(0, 4);

  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.intro}>
        <p className="caption">404</p>
        <h1 className={styles.title}>Sidan finns inte</h1>
        <p className={styles.lead}>
          Adressen kan vara felstavad, eller så har produkten flyttat. Sök efter det du letar efter eller börja i en
          kategori.
        </p>

        <form action="/sok" role="search" className={styles.form}>
          <label htmlFor="not-found-q" className="visually-hidden">
            Sök produkter
          </label>
          <input
            id="not-found-q"
            name="q"
            type="search"
            placeholder="Vad letar du efter?"
            className={styles.input}
          />
          <Button type="submit">Sök</Button>
        </form>

        <nav aria-label="Bläddra bland kategorier">
          <ul role="list" className={styles.categories}>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={categoryHref(c.id)} className={styles.category}>
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <Button href="/" variant="secondary">
            Till startsidan
          </Button>
        </div>
      </div>

      {featured.length > 0 && (
        <section aria-labelledby="not-found-featured" className={styles.featured}>
          <h2 id="not-found-featured" className={styles.featuredTitle}>
            Populärt just nu
          </h2>
          <ProductGrid products={featured} />
        </section>
      )}
    </div>
  );
}
