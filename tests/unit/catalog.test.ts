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
    expect(applyFilters(products, { ...none, category: "vaser" }).map((p) => p.slug)).toEqual(["ovo-vas"]);
    const blue = applyFilters(products, { ...none, colors: ["dimbla"] }).map((p) => p.slug);
    expect(blue).toContain("halo-bordslampa");
    expect(blue).toContain("lag-skal");
    // Låg skål in Dimblå is sold out, so "in stock" removes it.
    expect(applyFilters(products, { ...none, colors: ["dimbla"], inStock: true }).map((p) => p.slug)).toEqual(["halo-bordslampa"]);
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
    expect(counts.category("vaser")).toBe(1); // category facet ignores the category filter
    expect(counts.color("terrakotta")).toBe(0); // no lighting in terrakotta
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
