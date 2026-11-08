import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { feedCsv, feedItems, feedXml } from "@/lib/feeds";

const abs = (p: string) => `https://shop.example${p}`;
const items = feedItems(products, abs);

describe("product feeds", () => {
  it("has one item per variant, grouped by product", () => {
    const variants = products.flatMap((p) => p.variants.map((v) => ({ sku: v.sku, slug: p.slug })));
    expect(items).toHaveLength(variants.length);
    for (const v of variants) {
      const item = items.find((i) => i.id === v.sku);
      expect(item, v.sku).toBeDefined();
      expect(item!.itemGroupId).toBe(v.slug);
    }
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it("uses the formats Google and Meta require", () => {
    for (const i of items) {
      expect(i.price).toMatch(/^\d+\.\d{2} SEK$/);
      expect(["in_stock", "out_of_stock"]).toContain(i.availability);
      expect(i.link).toMatch(/^https:\/\/shop\.example\/produkter\/.+\?variant=/);
      expect(i.imageLink).toMatch(/^https:\/\//);
      expect(i.title.length).toBeLessThanOrEqual(150);
      expect(i.identifierExists).toBe("no");
    }
  });

  it("marks sold-out variants out of stock", () => {
    expect(items.find((i) => i.id === "SKAL-DIMBLA")?.availability).toBe("out_of_stock");
  });

  it("produces well-formed XML with escaped text", () => {
    const xml = feedXml(items, { title: "Objekt & co", link: abs("/"), description: "Test" });
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"');
    expect(xml).toContain("Objekt &amp; co");
    expect((xml.match(/<item>/g) ?? []).length).toBe(items.length);
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
  });

  it("produces a CSV with a header and one quoted row per item", () => {
    const lines = feedCsv(items).trim().split("\n");
    expect(lines[0]).toBe("id,item_group_id,title,description,availability,condition,price,link,image_link,brand,color,size,product_type,google_product_category");
    expect(lines).toHaveLength(items.length + 1);
    expect(lines[1].startsWith('"')).toBe(true);
  });
});
