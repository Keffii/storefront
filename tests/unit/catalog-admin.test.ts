import { describe, expect, it } from "vitest";
import { getProduct, products } from "@/data/products";
import { draftToProduct, emptyDraft, slugify, syncCombinations, toDraft, type ProductDraft } from "@/lib/catalog-admin";
import { imageSize } from "@/lib/image-size";

const ok = { slugTaken: false, addOnSlugs: products.map((p) => p.slug) };
const img = { src: "https://d1.cloudfront.net/products/x/a.jpg", alt: "Framifrån", width: 1200, height: 1200 };

function newDraft(overrides: Partial<ProductDraft> = {}): ProductDraft {
  const d: ProductDraft = {
    ...emptyDraft(),
    slug: "test-lampa",
    name: "Testlampa",
    tagline: "En lampa för tester.",
    description: "En tillräckligt lång beskrivning för att klara valideringen.",
    colors: [
      { id: "svart", label: "Svart", swatch: "#111111", images: [img] },
      { id: "vit", label: "Vit", swatch: "#eeeeee", images: [img] },
    ],
    defaultColor: "vit",
    ...overrides,
  };
  return { ...d, combinations: syncCombinations(d).map((c) => ({ ...c, price: 499, stock: 7 })) };
}

describe("slugify", () => {
  it("makes URL-safe ids from Swedish text", () => {
    expect(slugify("Rökgrå")).toBe("rokgra");
    expect(slugify("  Stor · 46 cm ")).toBe("stor-46-cm");
  });
});

describe("product editor round trip", () => {
  it("turns an existing product into a draft and back without changing it", () => {
    for (const p of products) {
      const res = draftToProduct(toDraft(p), { ...ok, skuPrefix: p.variants[0].sku.split("-")[0] }, p);
      expect(res.ok).toBe(true);
      if (!res.ok) continue;
      expect(res.product.variants.map((v) => [v.id, v.sku, v.price, v.stock])).toEqual(p.variants.map((v) => [v.id, v.sku, v.price, v.stock]));
      expect(res.product.defaultVariantId).toBe(p.defaultVariantId);
      expect(res.product.options).toEqual(p.options);
    }
  });
});

describe("draftToProduct", () => {
  it("builds one variant per colour and size with kronor converted to öre", () => {
    const d = newDraft({ sizes: [{ id: "s", label: "Liten" }, { id: "l", label: "Stor" }] });
    const withPrices = { ...d, combinations: syncCombinations(d).map((c) => ({ ...c, price: c.size === "l" ? 799.5 : 499, stock: 3 })) };
    const res = draftToProduct(withPrices, ok);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.product.variants.map((v) => [v.id, v.price])).toEqual([
      ["svart-s", 49900],
      ["svart-l", 79950],
      ["vit-s", 49900],
      ["vit-l", 79950],
    ]);
    expect(res.product.defaultVariantId).toBe("vit-s");
    expect(res.product.variants[0].sku).toBe("TEST-SVART-S");
  });

  it("rejects a taken slug, missing images and bad prices", () => {
    const d = newDraft();
    const broken = {
      ...d,
      colors: [{ ...d.colors[0], images: [] }, d.colors[1]],
      combinations: d.combinations.map((c) => ({ ...c, price: 0 })),
    };
    const res = draftToProduct(broken, { ...ok, slugTaken: true });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.errors.slug).toMatch(/redan/);
    expect(res.errors["colors.0.images"]).toBeDefined();
    expect(res.errors["combinations.0.price"]).toBeDefined();
  });

  it("only allows other existing products as add-ons", () => {
    const res = draftToProduct(newDraft({ addOns: [{ slug: "test-lampa", discountKr: 10 }] }), ok);
    expect(res.ok).toBe(false);
    const res2 = draftToProduct(newDraft({ addOns: [{ slug: "led-glodlampa", discountKr: 30 }] }), ok);
    expect(res2.ok && res2.product.addOns).toEqual([{ slug: "led-glodlampa", bundleDiscount: 3000 }]);
  });

  it("keeps a hidden product hidden", () => {
    const res = draftToProduct(newDraft({ published: false }), ok);
    expect(res.ok && res.product.published).toBe(false);
  });

  it("keeps the comparison table of an existing product", () => {
    const lamp = getProduct("halo-bordslampa")!;
    const res = draftToProduct(toDraft(lamp), ok, lamp);
    expect(res.ok && res.product.comparison).toEqual(lamp.comparison);
  });
});

describe("imageSize", () => {
  it("reads PNG dimensions", () => {
    const png = new Uint8Array(32);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const view = new DataView(png.buffer);
    view.setUint32(16, 1600);
    view.setUint32(20, 1200);
    expect(imageSize(png)).toEqual({ type: "png", width: 1600, height: 1200 });
  });

  it("reads JPEG dimensions from the start-of-frame segment", () => {
    // SOI, APP0 (length 4), SOF0 with height 900 and width 1200.
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x03, 0x84, 0x04, 0xb0, 0x03, 0, 0, 0, 0]);
    expect(imageSize(jpg)).toEqual({ type: "jpeg", width: 1200, height: 900 });
  });

  it("rejects other files", () => {
    expect(imageSize(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
  });
});
