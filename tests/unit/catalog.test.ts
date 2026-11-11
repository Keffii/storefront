import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { activeFilterCount, allColors, applyFilters, collectionHref, facetCounts, parseFilters, toQuery, type Filters } from "@/lib/catalog";
import { validateReview } from "@/lib/reviews";
import { findVariant, selectOption, soldOutValues, stockLevel } from "@/lib/variants";

const colorIds = allColors(products).map((c) => c.id);
const parse = (q: Record<string, string>, category: Filters["category"] = null) => parseFilters(q, colorIds, category);
const none: Filters = { category: null, colors: [], price: null, inStock: false, sort: "rekommenderat" };

describe("filters in the URL", () => {
  it("parses valid parameters and ignores invalid ones", () => {
    expect(parse({ farg: "krita,bogus,krita", pris: "0-500", ilager: "1", sortera: "namn" }, "vaser")).toEqual({
      category: "vaser",
      colors: ["krita"],
      price: "0-500",
      inStock: true,
      sort: "namn",
    });
    expect(parse({ pris: "bilar", sortera: "random" })).toEqual(none);
  });

  it("round-trips through the query string", () => {
    const f: Filters = { category: "belysning", colors: ["krita", "grafit"], price: "1500-", inStock: true, sort: "pris-fallande" };
    const q = Object.fromEntries(new URLSearchParams(toQuery(f).slice(1)));
    expect(parse(q, "belysning")).toEqual({ ...f, colors: ["grafit", "krita"] });
    expect(toQuery(none)).toBe("");
    expect(collectionHref(f)).toBe("/kollektion/belysning?farg=grafit%2Ckrita&pris=1500-&ilager=1&sortera=pris-fallande");
    expect(collectionHref(none)).toBe("/kollektion");
  });

  it("filters by category, colour and stock", () => {
    const vases = applyFilters(products, { ...none, category: "vaser" });
    expect(vases.map((p) => p.slug)).toContain("ovo-vas");
    expect(vases.every((p) => p.category === "vaser")).toBe(true);
    const blue = applyFilters(products, { ...none, colors: ["dimbla"] }).map((p) => p.slug);
    expect(blue).toContain("halo-bordslampa");
    expect(blue).toContain("lag-skal");
    // Låg skål in Dimblå is sold out, so "in stock" removes it.
    const blueInStock = applyFilters(products, { ...none, colors: ["dimbla"], inStock: true });
    expect(blueInStock.map((p) => p.slug)).toContain("halo-bordslampa");
    expect(blueInStock.map((p) => p.slug)).not.toContain("lag-skal");
    expect(blueInStock.every((p) => p.variants.some((v) => v.options.color === "dimbla" && v.stock > 0))).toBe(true);
  });

  it("filters by the lowest variant price", () => {
    const cheap = applyFilters(products, { ...none, price: "0-500" });
    expect(cheap.every((p) => Math.min(...p.variants.map((v) => v.price)) < 50000)).toBe(true);
  });

  it("sorts by price", () => {
    const asc = applyFilters(products, { ...none, sort: "pris-stigande" });
    const prices = asc.map((p) => Math.min(...p.variants.map((v) => v.price)));
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it("counts facets with the other filters applied", () => {
    const counts = facetCounts(products, { ...none, category: "belysning" });
    // The category facet ignores the category filter...
    expect(counts.category("vaser")).toBe(products.filter((p) => p.category === "vaser").length);
    // ...while the colour facet counts only lighting.
    const lightingInTerrakotta = products.filter(
      (p) => p.category === "belysning" && p.variants.some((v) => v.options.color === "terrakotta"),
    ).length;
    expect(counts.color("terrakotta")).toBe(lightingInTerrakotta);
    expect(counts.color("terrakotta")).toBeLessThan(products.filter((p) => p.variants.some((v) => v.options.color === "terrakotta")).length);
    expect(activeFilterCount({ ...none, category: "vaser", colors: ["krita", "grafit"] })).toBe(3);
  });
});

describe("variants", () => {
  const lamp = products.find((p) => p.slug === "halo-bordslampa")!;
  const grafitS = findVariant(lamp, { color: "grafit", size: "s" })!;

  it("keeps the other option when switching colour", () => {
    expect(selectOption(lamp, grafitS, "color", "krita").id).toBe("krita-s");
  });

  it("marks sold-out combinations", () => {
    const grafitL = findVariant(lamp, { color: "grafit", size: "l" })!;
    expect([...soldOutValues(lamp, grafitL, "color")]).toEqual(["dimbla"]);
    expect(stockLevel(findVariant(lamp, { color: "krita", size: "l" })!)).toBe("low");
  });
});

describe("validateReview", () => {
  it("accepts a valid review and cleans whitespace", () => {
    const r = validateReview({ name: "  Anna ", rating: 5, title: "", body: "Fin lampa   som ger ett   mjukt ljus." });
    expect(r).toEqual({ ok: true, value: { name: "Anna", rating: 5, title: "", body: "Fin lampa som ger ett mjukt ljus." } });
  });

  it("rejects missing or out-of-range fields", () => {
    const r = validateReview({ name: "A", rating: 6, body: "kort" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(["body", "name", "rating"]);
  });
});

describe("product photos", () => {
  it("every variant has at least one photo, and every photo file exists", async () => {
    const { existsSync } = await import("node:fs");
    const { products } = await import("@/data/products");
    for (const p of products) {
      for (const v of p.variants) {
        expect(v.images.length, `${p.slug} ${v.id}`).toBeGreaterThan(0);
        for (const img of v.images) expect(existsSync(`public${img.src}`), img.src).toBe(true);
      }
    }
  });
});
