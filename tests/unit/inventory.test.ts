import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { priceCart } from "@/lib/cart";
import { shortages, stockKey, withStock } from "@/lib/inventory";

const lampKey = stockKey("halo-bordslampa", "grafit-s");

describe("withStock", () => {
  it("returns the catalogue unchanged when there are no live levels", () => {
    expect(withStock(products, {})).toBe(products);
  });

  it("overrides only the variants that have a live level", () => {
    const live = withStock(products, { [lampKey]: 2 });
    const lamp = live.find((p) => p.slug === "halo-bordslampa")!;
    expect(lamp.variants.find((v) => v.id === "grafit-s")!.stock).toBe(2);
    expect(lamp.variants.find((v) => v.id === "krita-l")!.stock).toBe(3); // catalogue value
    // Untouched products keep their identity (cheap re-renders).
    expect(live.find((p) => p.slug === "ovo-vas")).toBe(products.find((p) => p.slug === "ovo-vas"));
  });

  it("never shows negative stock", () => {
    const live = withStock(products, { [lampKey]: -4 });
    expect(live.find((p) => p.slug === "halo-bordslampa")!.variants.find((v) => v.id === "grafit-s")!.stock).toBe(0);
  });

  it("makes a sold-out variant drop out of the cart", () => {
    const live = withStock(products, { [lampKey]: 0 });
    const cart = priceCart([{ slug: "halo-bordslampa", variantId: "grafit-s", quantity: 1 }], live);
    expect(cart.lines).toHaveLength(0);
    expect(cart.removed).toHaveLength(1);
  });
});

describe("shortages", () => {
  it("lists lines that want more than is in stock", () => {
    const live = withStock(products, { [lampKey]: 1 });
    expect(shortages([{ slug: "halo-bordslampa", variantId: "grafit-s", quantity: 2 }], live)).toEqual([
      { slug: "halo-bordslampa", variantId: "grafit-s", wanted: 2, available: 1 },
    ]);
    expect(shortages([{ slug: "halo-bordslampa", variantId: "grafit-s", quantity: 1 }], live)).toEqual([]);
  });
});
