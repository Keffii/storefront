import type { Metadata } from "next";
import Link from "next/link";
import { ProductGrid } from "@/components/patterns/ProductGrid";
import { categories, getCategory, products } from "@/data/products";
import type { CategoryId } from "@/lib/types";
import styles from "./kollektion.module.css";

export const metadata: Metadata = {
  title: "Alla produkter",
};

// Phase 1: category filter only. Phase 4 adds more filters and sorting in the URL.
export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string }>;
}) {
  const { kategori } = await searchParams;
  const category = kategori ? getCategory(kategori as CategoryId) : undefined;
  const list = category ? products.filter((p) => p.category === category.id) : products;

  return (
    <div className="container">
      <header className={styles.header}>
        <p className="caption">Kollektion</p>
        <h1 className={styles.title}>{category?.name ?? "Alla produkter"}</h1>
        <p className={styles.count}>{list.length} produkter</p>
      </header>

      <nav aria-label="Kategorier" className={styles.filters}>
        <ul role="list" className={styles.pills}>
          <li>
            <Link href="/kollektion" className={styles.pill} aria-current={!category ? "page" : undefined}>
              Alla
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/kollektion?kategori=${c.id}`}
                className={styles.pill}
                aria-current={category?.id === c.id ? "page" : undefined}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <ProductGrid products={list} priorityCount={4} />
    </div>
  );
}
