/**
 * Collection filtering and sorting. The URL is the state: every filter is a
 * query parameter, so filtered views are shareable, bookmarkable,
 * back-button friendly and server-rendered.
 *
 *   /kollektion?kategori=belysning&farg=grafit,krita&pris=0-1000&ilager=1&sortera=pris-stigande
 */
import type { CategoryId, OptionValue, Product } from "./types";

export const SORTS = [
  { id: "rekommenderat", label: "Rekommenderat" },
  { id: "pris-stigande", label: "Pris, lägst först" },
  { id: "pris-fallande", label: "Pris, högst först" },
  { id: "nyheter", label: "Nyheter först" },
  { id: "namn", label: "Namn A–Ö" },
] as const;

export type SortId = (typeof SORTS)[number]["id"];

export const PRICE_RANGES = [
  { id: "0-500", label: "Under 500 kr", min: 0, max: 50000 },
  { id: "500-1500", label: "500–1 500 kr", min: 50000, max: 150000 },
  { id: "1500-", label: "Över 1 500 kr", min: 150000, max: Infinity },
] as const;

export type PriceRangeId = (typeof PRICE_RANGES)[number]["id"];

export interface Filters {
  category: CategoryId | null;
  colors: string[];
  price: PriceRangeId | null;
  inStock: boolean;
  sort: SortId;
}

type Params = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseFilters(params: Params, categoryIds: readonly string[], colorIds: readonly string[]): Filters {
  const category = first(params.kategori);
  const colors = (first(params.farg) ?? "")
    .split(",")
    .map((c) => c.trim())
    .filter((c) => colorIds.includes(c));
  const price = first(params.pris);
  const sort = first(params.sortera);
  return {
    category: category && categoryIds.includes(category) ? (category as CategoryId) : null,
    colors: [...new Set(colors)],
    price: PRICE_RANGES.some((r) => r.id === price) ? (price as PriceRangeId) : null,
    inStock: first(params.ilager) === "1",
    sort: SORTS.some((s) => s.id === sort) ? (sort as SortId) : "rekommenderat",
  };
}

/** Builds the query string for a filter state, omitting defaults. */
export function toQuery(f: Filters): string {
  const q = new URLSearchParams();
  if (f.category) q.set("kategori", f.category);
  if (f.colors.length) q.set("farg", [...f.colors].sort().join(","));
  if (f.price) q.set("pris", f.price);
  if (f.inStock) q.set("ilager", "1");
  if (f.sort !== "rekommenderat") q.set("sortera", f.sort);
  const s = q.toString();
  return s ? `?${s}` : "";
}

const minPrice = (p: Product) => Math.min(...p.variants.map((v) => v.price));
const colorIdsOf = (p: Product) => p.options.find((o) => o.id === "color")?.values.map((v) => v.id) ?? [];

/** Every colour used in the catalogue, in first-seen order. */
export function allColors(products: Product[]): OptionValue[] {
  const seen = new Map<string, OptionValue>();
  for (const p of products) for (const v of p.options.find((o) => o.id === "color")?.values ?? []) seen.set(v.id, v);
  return [...seen.values()];
}

function matches(p: Product, f: Filters, skip?: keyof Filters): boolean {
  if (skip !== "category" && f.category && p.category !== f.category) return false;
  if (skip !== "price" && f.price) {
    const range = PRICE_RANGES.find((r) => r.id === f.price)!;
    const price = minPrice(p);
    if (price < range.min || price >= range.max) return false;
  }
  if (skip !== "inStock" && f.inStock && !p.variants.some((v) => v.stock > 0)) return false;
  if (skip !== "colors" && f.colors.length) {
    // A product matches a colour if a variant in that colour exists (and is
    // in stock, when "only in stock" is on).
    const ok = f.colors.some((c) =>
      p.variants.some((v) => v.options.color === c && (!f.inStock || v.stock > 0)),
    );
    if (!ok) return false;
  }
  return true;
}

export function applyFilters(products: Product[], f: Filters): Product[] {
  return sortProducts(
    products.filter((p) => matches(p, f)),
    f.sort,
  );
}

export function sortProducts(products: Product[], sort: SortId): Product[] {
  const list = [...products];
  switch (sort) {
    case "pris-stigande":
      return list.sort((a, b) => minPrice(a) - minPrice(b));
    case "pris-fallande":
      return list.sort((a, b) => minPrice(b) - minPrice(a));
    case "nyheter":
      return list.sort((a, b) => Number(b.badges.includes("new")) - Number(a.badges.includes("new")));
    case "namn":
      return list.sort((a, b) => a.name.localeCompare(b.name, "sv"));
    default:
      // Featured first, then catalogue order (Array.prototype.sort is stable).
      return list.sort((a, b) => Number(b.featured) - Number(a.featured));
  }
}

/**
 * Result counts per facet value, computed with every other active filter
 * applied (the usual "how many would I get if I ticked this" behaviour).
 */
export function facetCounts(products: Product[], f: Filters) {
  const count = (skip: keyof Filters, pred: (p: Product) => boolean) =>
    products.filter((p) => matches(p, f, skip) && pred(p)).length;
  return {
    category: (id: CategoryId) => count("category", (p) => p.category === id),
    color: (id: string) => count("colors", (p) => colorIdsOf(p).includes(id) && p.variants.some((v) => v.options.color === id && (!f.inStock || v.stock > 0))),
    price: (id: PriceRangeId) => {
      const r = PRICE_RANGES.find((x) => x.id === id)!;
      return count("price", (p) => minPrice(p) >= r.min && minPrice(p) < r.max);
    },
    inStock: () => count("inStock", (p) => p.variants.some((v) => v.stock > 0)),
  };
}

export function activeFilterCount(f: Filters): number {
  return (f.category ? 1 : 0) + f.colors.length + (f.price ? 1 : 0) + (f.inStock ? 1 : 0);
}
