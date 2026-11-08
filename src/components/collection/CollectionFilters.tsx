"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { collectionHref, SORTS, type Filters, type PriceRangeId, type SortId } from "@/lib/catalog";
import type { CategoryId } from "@/lib/types";
import styles from "./CollectionFilters.module.css";

export interface FacetOption<T extends string = string> {
  id: T;
  label: string;
  count: number;
  swatch?: string;
}

interface Props {
  filters: Filters;
  categories: FacetOption<CategoryId>[];
  colors: FacetOption[];
  prices: FacetOption<PriceRangeId>[];
  inStockCount: number;
  resultCount: number;
  activeCount: number;
  /** Applies a same-category filter change (updates the URL in place). */
  onFilterChange: (href: string) => void;
}

/**
 * Filter and sort controls; the URL is the only state. Choosing a category
 * navigates to that category's static page. Other filters update the query
 * string in place (history.pushState), which Next.js reflects in
 * useSearchParams, so results change instantly and Back undoes a filter.
 * On phones the filters live in a drawer, on wide screens in a sidebar.
 */
export function CollectionFilters(props: Props) {
  const { resultCount, activeCount } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  // Optimistic copy so a category click responds while the next page loads.
  const [filters, setFilters] = useState(props.filters);
  useEffect(() => setFilters(props.filters), [props.filters]);

  function go(next: Filters) {
    setFilters(next);
    const href = collectionHref(next);
    if (next.category !== props.filters.category) {
      startTransition(() => router.push(href, { scroll: false }));
    } else {
      props.onFilterChange(href);
    }
  }

  return (
    <>
      <div className={styles.toolbar} aria-busy={pending}>
        <Button variant="secondary" className={styles.filterButton} onClick={() => setOpen(true)} aria-haspopup="dialog">
          Filtrera{activeCount > 0 ? ` (${activeCount})` : ""}
        </Button>
        <p className={styles.count} aria-live="polite">
          {pending ? "Uppdaterar …" : `${resultCount} ${resultCount === 1 ? "produkt" : "produkter"}`}
        </p>
        <label className={styles.sort}>
          <span className="caption">Sortera</span>
          <select
            value={filters.sort}
            onChange={(e) => go({ ...filters, sort: e.target.value as SortId })}
            className={styles.select}
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <aside className={styles.sidebar} aria-label="Filter">
        <FilterGroups {...props} filters={filters} onChange={go} />
      </aside>

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Filtrera"
        side="left"
        footer={
          <div className={styles.drawerFooter}>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                onClick={() => go({ category: null, colors: [], price: null, inStock: false, sort: filters.sort })}
              >
                Rensa
              </Button>
            )}
            <Button fullWidth onClick={() => setOpen(false)}>
              Visa {resultCount} {resultCount === 1 ? "produkt" : "produkter"}
            </Button>
          </div>
        }
      >
        <FilterGroups {...props} filters={filters} onChange={go} />
      </Drawer>
    </>
  );
}

function FilterGroups({
  filters,
  categories,
  colors,
  prices,
  inStockCount,
  onChange,
}: Omit<Props, "onFilterChange"> & { onChange: (f: Filters) => void }) {
  // The groups render twice (sidebar and drawer); unique names keep the two
  // sets of radios from acting as one group.
  const groupName = `kategori-${useId()}`;
  const toggleColor = (id: string) =>
    onChange({
      ...filters,
      colors: filters.colors.includes(id) ? filters.colors.filter((c) => c !== id) : [...filters.colors, id],
    });

  return (
    <div className={styles.groups}>
      <fieldset className={styles.group}>
        <legend className="caption">Kategori</legend>
        <label className={styles.option}>
          <input
            type="radio"
            name={groupName}
            checked={filters.category === null}
            onChange={() => onChange({ ...filters, category: null })}
          />
          <span>Alla</span>
        </label>
        {categories.map((c) => (
          <label key={c.id} className={styles.option} data-empty={c.count === 0 || undefined}>
            <input
              type="radio"
              name={groupName}
              checked={filters.category === c.id}
              onChange={() => onChange({ ...filters, category: c.id })}
            />
            <span>{c.label}</span>
            <span className={styles.facetCount}>{c.count}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.group}>
        <legend className="caption">Färg</legend>
        <div className={styles.colors}>
          {colors.map((c) => (
            <label
              key={c.id}
              className={styles.color}
              data-empty={c.count === 0 || undefined}
              title={`${c.label} (${c.count})`}
            >
              <input
                type="checkbox"
                className="visually-hidden"
                checked={filters.colors.includes(c.id)}
                onChange={() => toggleColor(c.id)}
              />
              <span className={styles.dot} style={{ background: c.swatch }} aria-hidden="true" />
              <span className={styles.colorLabel}>{c.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className={styles.group}>
        <legend className="caption">Pris</legend>
        {prices.map((p) => (
          <label key={p.id} className={styles.option} data-empty={p.count === 0 || undefined}>
            <input
              type="checkbox"
              checked={filters.price === p.id}
              onChange={() => onChange({ ...filters, price: filters.price === p.id ? null : p.id })}
            />
            <span>{p.label}</span>
            <span className={styles.facetCount}>{p.count}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.group}>
        <legend className="caption">Tillgänglighet</legend>
        <label className={styles.option}>
          <input
            type="checkbox"
            checked={filters.inStock}
            onChange={() => onChange({ ...filters, inStock: !filters.inStock })}
          />
          <span>Endast i lager</span>
          <span className={styles.facetCount}>{inStockCount}</span>
        </label>
      </fieldset>
    </div>
  );
}
