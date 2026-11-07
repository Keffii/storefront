import type { Metadata } from "next";
import Link from "next/link";
import { CollectionFilters } from "@/components/collection/CollectionFilters";
import { ProductGrid } from "@/components/patterns/ProductGrid";
import { Button } from "@/components/ui/Button";
import { categories, getCategory, products } from "@/data/products";
import {
  activeFilterCount,
  allColors,
  applyFilters,
  facetCounts,
  parseFilters,
  PRICE_RANGES,
  toQuery,
  type Filters,
} from "@/lib/catalog";
import { getRatingSummaries } from "@/lib/server/reviews";
import styles from "./kollektion.module.css";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const colorValues = allColors(products);
const parse = (params: Record<string, string | string[] | undefined>) =>
  parseFilters(
    params,
    categories.map((c) => c.id),
    colorValues.map((c) => c.id),
  );

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const filters = parse(await searchParams);
  const category = filters.category ? getCategory(filters.category) : undefined;
  const filtered = activeFilterCount(filters) > (category ? 1 : 0) || filters.sort !== "rekommenderat";
  return {
    title: category?.name ?? "Alla produkter",
    description: category
      ? `${category.name}: ${category.description.toLowerCase()} från Objekt.`
      : "Alla föremål från Objekt: belysning, vaser, möbler och bordsartiklar.",
    // Category pages are indexable; other filter combinations point to them.
    alternates: { canonical: category ? `/kollektion?kategori=${category.id}` : "/kollektion" },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function CollectionPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parse(await searchParams);
  const list = applyFilters(products, filters);
  const counts = facetCounts(products, filters);
  const category = filters.category ? getCategory(filters.category) : undefined;
  const activeCount = activeFilterCount(filters);
  const ratings = await getRatingSummaries(products.map((p) => p.slug));

  const chips: { label: string; next: Filters }[] = [
    ...(category ? [{ label: category.name, next: { ...filters, category: null } }] : []),
    ...filters.colors.map((id) => ({
      label: colorValues.find((c) => c.id === id)?.label ?? id,
      next: { ...filters, colors: filters.colors.filter((c) => c !== id) },
    })),
    ...(filters.price
      ? [{ label: PRICE_RANGES.find((r) => r.id === filters.price)!.label, next: { ...filters, price: null } }]
      : []),
    ...(filters.inStock ? [{ label: "I lager", next: { ...filters, inStock: false } }] : []),
  ];

  return (
    <div className="container">
      <header className={styles.header}>
        <nav aria-label="Brödsmulor" className={styles.breadcrumbs}>
          <ol role="list">
            <li>
              <Link href="/">Start</Link>
            </li>
            {category ? (
              <>
                <li>
                  <Link href="/kollektion">Alla produkter</Link>
                </li>
                <li aria-current="page">{category.name}</li>
              </>
            ) : (
              <li aria-current="page">Alla produkter</li>
            )}
          </ol>
        </nav>
        <h1 className={styles.title}>{category?.name ?? "Alla produkter"}</h1>
        {category && <p className={styles.lead}>{category.description}</p>}
      </header>

      <div className={styles.layout}>
        <CollectionFilters
          filters={filters}
          categories={categories.map((c) => ({ id: c.id, label: c.name, count: counts.category(c.id) }))}
          colors={colorValues.map((c) => ({ id: c.id, label: c.label, swatch: c.swatch, count: counts.color(c.id) }))}
          prices={PRICE_RANGES.map((r) => ({ id: r.id, label: r.label, count: counts.price(r.id) }))}
          inStockCount={counts.inStock()}
          resultCount={list.length}
          activeCount={activeCount}
        />

        <div className={styles.results}>
          {chips.length > 0 && (
            <ul role="list" className={styles.chips} aria-label="Aktiva filter">
              {chips.map((c) => (
                <li key={c.label}>
                  <Link href={`/kollektion${toQuery(c.next)}`} scroll={false} className={styles.chip}>
                    {c.label}
                    <span aria-hidden="true">×</span>
                    <span className="visually-hidden"> (ta bort filter)</span>
                  </Link>
                </li>
              ))}
              {chips.length > 1 && (
                <li>
                  <Link href={`/kollektion${toQuery({ category: null, colors: [], price: null, inStock: false, sort: filters.sort })}`} scroll={false} className={styles.clear}>
                    Rensa alla
                  </Link>
                </li>
              )}
            </ul>
          )}

          {list.length > 0 ? (
            <ProductGrid products={list} priorityCount={4} ratings={ratings} />
          ) : (
            <div className={styles.empty}>
              <h2 className={styles.emptyTitle}>Inga produkter matchar filtren</h2>
              <p>Prova att ta bort ett filter eller visa hela sortimentet.</p>
              <Button href="/kollektion" variant="secondary">
                Visa alla produkter
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
