import type { Metadata } from "next";
import { ProductGrid } from "@/components/patterns/ProductGrid";
import { Button } from "@/components/ui/Button";
import { getCatalogWithStock } from "@/lib/server/catalog";
import { getRatingSummaries } from "@/lib/server/reviews";
import { SEARCH_SUGGESTIONS, searchProducts } from "@/lib/search";
import styles from "./sok.module.css";

export const metadata: Metadata = { title: "Sök", robots: { index: false, follow: true } };

/** Server-rendered results: shareable, and the fallback when JavaScript is off. */
export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").slice(0, 80);
  const products = await getCatalogWithStock();
  const results = q.trim() ? searchProducts(products, q) : [];
  const ratings = results.length ? await getRatingSummaries(results.map((p) => p.slug)) : {};

  return (
    <div className={`container ${styles.page}`}>
      <p className="caption">Sök</p>
      <form action="/sok" role="search" className={styles.form}>
        <label htmlFor="sok-q" className="visually-hidden">
          Sök produkter
        </label>
        <input id="sok-q" name="q" type="search" defaultValue={q} placeholder="Sök efter produkt, färg eller material" className={styles.input} />
        <Button type="submit">Sök</Button>
      </form>

      {q.trim() === "" ? (
        <p className={styles.lead}>Skriv vad du letar efter, till exempel {SEARCH_SUGGESTIONS.slice(0, 3).join(", ").toLowerCase()}.</p>
      ) : results.length === 0 ? (
        <div className={styles.empty}>
          <h1 className={styles.title}>Inga träffar på ”{q}”</h1>
          <p className={styles.lead}>Prova ett annat ord, en färg eller ett material. Eller bläddra bland alla produkter.</p>
          <div>
            <Button href="/kollektion" variant="secondary">
              Visa alla produkter
            </Button>
          </div>
        </div>
      ) : (
        <>
          <h1 className={styles.title}>
            {results.length} {results.length === 1 ? "träff" : "träffar"} på ”{q}”
          </h1>
          <ProductGrid products={results} priorityCount={2} ratings={ratings} />
        </>
      )}
    </div>
  );
}
