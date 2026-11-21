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

  it("finds Swedish compounds by a word inside them", () => {
    const lamps = ["halo-bordslampa", "kupol-taklampa", "liten-vagglampa", "staende-golvlampa", "led-glodlampa", "bordslampa-mini"];
    expect(slugs("lampa")).toEqual(expect.arrayContaining(lamps));
    expect(slugs("LAMPA")).toEqual(slugs("lampa"));
  });

  it("ranks word-start matches above matches inside a word", () => {
    const vas = slugs("vas");
    expect(vas.slice(0, 2)).toEqual(expect.arrayContaining(["bred-vas", "ovo-vas"]));
    expect(vas).toEqual(expect.arrayContaining(["flaskvas", "glasvas"]));
    expect(vas.indexOf("ovo-vas")).toBeLessThan(vas.indexOf("flaskvas"));
  });

  it("keeps short queries to word starts", () => {
    expect(slugs("ek").sort()).toEqual(["serveringsbricka", "sidobord", "vagghylla", "vaggspegel"]);
    expect(slugs("amp")).toEqual([]);
  });
});
