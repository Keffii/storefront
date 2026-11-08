/**
 * "Passar bra med": products that go with the one being viewed. Add-ons the
 * product offers come first, then products from other categories that share
 * a colour (things that look right together), then the same category.
 * Sold-out products are left out. Deterministic, so pages stay static.
 */
import type { Product } from "./types";

const colorsOf = (p: Product) => new Set(p.options.find((o) => o.id === "color")?.values.map((v) => v.id) ?? []);
const inStock = (p: Product) => p.variants.some((v) => v.stock > 0);

export function recommendations(product: Product, catalog: Product[], count = 4): Product[] {
  const others = catalog.filter((p) => p.slug !== product.slug && inStock(p));
  const picked: Product[] = [];
  const add = (p: Product | undefined) => {
    if (p && picked.length < count && !picked.some((x) => x.slug === p.slug)) picked.push(p);
  };

  for (const a of product.addOns) add(others.find((p) => p.slug === a.slug));

  const colors = colorsOf(product);
  const shared = (p: Product) => [...colorsOf(p)].filter((c) => colors.has(c)).length;
  others
    .filter((p) => p.category !== product.category && shared(p) > 0)
    .sort((a, b) => shared(b) - shared(a) || a.slug.localeCompare(b.slug))
    .forEach(add);
  others.filter((p) => p.category === product.category).forEach(add);
  others.forEach(add);
  return picked;
}
