/**
 * Live stock levels. The catalogue file holds the starting stock; DynamoDB
 * holds the current level once a variant has sold or been adjusted. This
 * module is pure so the browser and server apply stock the same way.
 */
import type { Product } from "./types";

/** Current stock per variant, keyed "<slug>:<variantId>". Missing keys use the catalogue value. */
export type StockMap = Record<string, number>;

export const stockKey = (slug: string, variantId: string) => `${slug}:${variantId}`;

/** Returns the products with live stock applied. Unchanged products keep their identity. */
export function withStock(products: Product[], stock: StockMap): Product[] {
  if (Object.keys(stock).length === 0) return products;
  return products.map((p) => {
    let changed = false;
    const variants = p.variants.map((v) => {
      const live = stock[stockKey(p.slug, v.id)];
      if (live === undefined || live === v.stock) return v;
      changed = true;
      return { ...v, stock: Math.max(0, live) };
    });
    return changed ? { ...p, variants } : p;
  });
}

/** Which order lines can't be fulfilled from the given stock. */
export function shortages(
  lines: { slug: string; variantId: string; quantity: number }[],
  products: Product[],
): { slug: string; variantId: string; wanted: number; available: number }[] {
  const out = [];
  for (const l of lines) {
    const available = products.find((p) => p.slug === l.slug)?.variants.find((v) => v.id === l.variantId)?.stock ?? 0;
    if (available < l.quantity) out.push({ slug: l.slug, variantId: l.variantId, wanted: l.quantity, available });
  }
  return out;
}
