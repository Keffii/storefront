import type { OptionDefinition, Product, Variant } from "./types";

export type Selection = Partial<Record<OptionDefinition["id"], string>>;

/** The variant matching every selected option, if one exists. */
export function findVariant(product: Product, selection: Selection): Variant | undefined {
  return product.variants.find((v) => product.options.every((o) => v.options[o.id] === selection[o.id]));
}

export function findVariantById(product: Product, id: string | null | undefined): Variant | undefined {
  return id ? product.variants.find((v) => v.id === id) : undefined;
}

/**
 * Picks `valueId` for `optionId`, keeping the other choices when that
 * combination exists, otherwise falling back to the first in-stock variant
 * with that value (then any variant with it).
 */
export function selectOption(
  product: Product,
  current: Variant,
  optionId: OptionDefinition["id"],
  valueId: string,
): Variant {
  const wanted = { ...current.options, [optionId]: valueId };
  const exact = findVariant(product, wanted);
  if (exact) return exact;
  const withValue = product.variants.filter((v) => v.options[optionId] === valueId);
  return withValue.find((v) => v.stock > 0) ?? withValue[0] ?? current;
}

/**
 * Values of `optionId` that are sold out when combined with the current
 * choices for the other options.
 */
export function soldOutValues(product: Product, current: Variant, optionId: OptionDefinition["id"]): Set<string> {
  const option = product.options.find((o) => o.id === optionId);
  const out = new Set<string>();
  if (!option) return out;
  for (const value of option.values) {
    const v = findVariant(product, { ...current.options, [optionId]: value.id });
    if (!v || v.stock <= 0) out.add(value.id);
  }
  return out;
}

export type StockLevel = "in-stock" | "low" | "sold-out";

export const LOW_STOCK_THRESHOLD = 5;

export function stockLevel(variant: Variant): StockLevel {
  if (variant.stock <= 0) return "sold-out";
  if (variant.stock <= LOW_STOCK_THRESHOLD) return "low";
  return "in-stock";
}

/** "Halo bordslampa – Grafit, Liten · 32 cm" */
export function variantLabel(product: Product, variant: Variant): string {
  const parts = product.options
    .filter((o) => o.values.length > 1)
    .map((o) => o.values.find((v) => v.id === variant.options[o.id])?.label)
    .filter(Boolean);
  return parts.length ? `${product.name} – ${parts.join(", ")}` : product.name;
}
