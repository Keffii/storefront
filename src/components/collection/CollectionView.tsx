"use client";

import { useCallback, useEffect, useState } from "react";
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
}

/**
 * Filters, chips and the product grid for one collection page. The static
 * HTML is the unfiltered list; after hydration the query string is read and
 * applied, and Back/Forward re-apply it. One component instance throughout,
 * so React hydrates the grid once instead of swapping in a second tree.
 */
export function CollectionView({ category, ratings }: ViewProps) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    const sync = () => setSearch(window.location.search);
    sync();
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  /** Same-page filter change: update the URL without a server round trip. */
  const navigate = useCallback((href: string) => {
    window.history.pushState(null, "", href);
    setSearch(window.location.search);
  }, []);

  const params = Object.fromEntries(new URLSearchParams(search).entries());
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
        onFilterChange={navigate}
      />

      <div className={styles.results}>
        {chips.length > 0 && (
          <ul role="list" className={styles.chips} aria-label="Aktiva filter">
            {chips.map((c) => (
              <li key={c.label}>
                <a
                  href={collectionHref(c.next)}
                  className={styles.chip}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(collectionHref(c.next));
                  }}
                >
                  {c.label}
                  <span aria-hidden="true">×</span>
                  <span className="visually-hidden"> (ta bort filter)</span>
                </a>
              </li>
            ))}
            {chips.length > 1 && (
              <li>
                <a
                  href={collectionHref(cleared)}
                  className={styles.clear}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(collectionHref(cleared));
                  }}
                >
                  Rensa alla
                </a>
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
