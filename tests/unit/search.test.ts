import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { fold, searchProducts } from "@/lib/search";

const slugs = (q: string) => searchProducts(products, q).map((p) => p.slug);

describe("search", () => {
  it("folds case and Swedish letters", () => {
    expect(fold("Väggspegel ÖVER")).toBe("vaggspegel over");
  });

  it("finds products by name, best match first", () => {
    expect(slugs("halo")[0]).toBe("halo-bordslampa");
    expect(slugs("vagg")).toEqual(expect.arrayContaining(["vaggspegel", "vagghylla"]));
  });

  it("matches category, colour and material", () => {
    expect(slugs("belysning")).toContain("kupol-taklampa");
    expect(slugs("terrakotta")).toContain("ovo-vas");
    expect(slugs("stengods")).toContain("mugg");
  });

  it("requires every word to match", () => {
    const both = slugs("vas olivgrön");
    expect(both).toContain("ovo-vas");
    expect(both.every((s) => products.find((p) => p.slug === s)!.variants.some((v) => v.options.color === "olivgron"))).toBe(true);
  });

  it("returns nothing for empty or unknown queries", () => {
    expect(slugs("   ")).toEqual([]);
    expect(slugs("xyzzy")).toEqual([]);
  });

  it("matches word prefixes, not the middle of words", () => {
    expect(slugs("ampa")).toEqual([]);
  });
});
