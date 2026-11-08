"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ProductGrid } from "@/components/patterns/ProductGrid";
import { Button } from "@/components/ui/Button";
import { categories, products } from "@/data/products";
import {
  activeFilterCount,
  allColors,
  applyFilters,
  collectionHref,
  facetCounts,
  parseFilters,
  PRICE_RANGES,
  type Filters,
} from "@/lib/catalog";
import type { RatingSummary } from "@/lib/reviews";
import type { CategoryId } from "@/lib/types";
import { CollectionFilters } from "./CollectionFilters";
import styles from "./CollectionView.module.css";

const colorValues = allColors(products);

interface ViewProps {
  category: CategoryId | null;
  ratings: Record<string, RatingSummary>;
  /** Query string to apply; null renders the unfiltered list (static HTML). */
  search: URLSearchParams | null;
}

/**
 * Filters, chips and the product grid for one collection page. The page's
 * HTML is static (the unfiltered list); query filters apply in the browser.
 */
export function CollectionView({ category, ratings, search }: ViewProps) {
  const params = search ? Object.fromEntries(search.entries()) : {};
  const filters = parseFilters(
    params,
    colorValues.map((c) => c.id),
    category,
  );
  const list = applyFilters(products, filters);
  const counts = facetCounts(products, filters);
  const activeCount = activeFilterCount(filters);
  const cleared: Filters = { category, colors: [], price: null, inStock: false, sort: filters.sort };

  const chips: { label: string; next: Filters }[] = [
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
                <Link href={collectionHref(c.next)} scroll={false} replace className={styles.chip}>
                  {c.label}
                  <span aria-hidden="true">×</span>
                  <span className="visually-hidden"> (ta bort filter)</span>
                </Link>
              </li>
            ))}
            {chips.length > 1 && (
              <li>
                <Link href={collectionHref(cleared)} scroll={false} replace className={styles.clear}>
                  Rensa alla
                </Link>
              </li>
            )}
          </ul>
        )}

        {list.length > 0 ? (
          <>
            <h2 className="visually-hidden">Produkter</h2>
            <ProductGrid products={list} priorityCount={2} ratings={ratings} />
          </>
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
  );
}

/** Reads the query string; must sit inside a Suspense boundary on a static page. */
export function CollectionViewWithSearch(props: Omit<ViewProps, "search">) {
  const search = useSearchParams();
  return <CollectionView {...props} search={new URLSearchParams(search.toString())} />;
}
