import { describe, expect, it } from "vitest";
import { site } from "@/data/products";
import { clampQuantity, normaliseLines, priceCart, setsFor, suggestAddOn } from "@/lib/cart";
import { parseCheckoutBody, toCheckoutLineItems } from "@/lib/checkout";
import { formatPrice } from "@/lib/format";

const lamp = { slug: "halo-bordslampa", variantId: "grafit-s", quantity: 1 }; // 1 495 kr
const bulb = { slug: "led-glodlampa", variantId: "varmvit", quantity: 1 }; // 149 kr, −30 kr with the lamp
const bowl = { slug: "lag-skal", variantId: "krita", quantity: 1 }; // 395 kr

describe("priceCart", () => {
  it("returns an empty cart for no lines", () => {
    const c = priceCart([]);
    expect(c).toMatchObject({ itemCount: 0, subtotal: 0, shipping: 0, total: 0 });
  });

  it("charges shipping below the free-shipping threshold", () => {
    const c = priceCart([bowl]);
    expect(c.subtotal).toBe(39500);
    expect(c.shipping).toBe(site.shippingFee);
    expect(c.total).toBe(39500 + site.shippingFee);
    expect(c.freeShippingRemaining).toBe(site.freeShippingThreshold - 39500);
  });

  it("gives free shipping at or above the threshold", () => {
    const c = priceCart([lamp]);
    expect(c.qualifiesForFreeShipping).toBe(true);
    expect(c.shipping).toBe(0);
    expect(c.freeShippingRemaining).toBe(0);
  });

  it("applies the bundle discount only with the parent product", () => {
    expect(priceCart([bulb]).discount).toBe(0);
    const c = priceCart([lamp, bulb]);
    expect(c.discount).toBe(3000);
    expect(c.total).toBe(149500 + 14900 - 3000);
  });

  it("limits the bundle discount to the number of parent units", () => {
    const c = priceCart([lamp, { ...bulb, quantity: 3 }]);
    const bulbLine = c.lines.find((l) => l.slug === "led-glodlampa")!;
    expect(bulbLine.discountedUnits).toBe(1);
    expect(bulbLine.total).toBe(3 * 14900 - 3000);
  });

  it("drops unknown and sold-out variants", () => {
    const c = priceCart([lamp, { slug: "nope", variantId: "x", quantity: 1 }, { slug: "halo-bordslampa", variantId: "dimbla-l", quantity: 1 }]);
    expect(c.lines).toHaveLength(1);
    expect(c.removed).toHaveLength(2);
  });

  it("clamps quantities to stock and the per-line maximum", () => {
    expect(clampQuantity(50, 100)).toBe(10);
    expect(clampQuantity(5, 3)).toBe(3);
    expect(clampQuantity(0, 10)).toBe(1);
    expect(clampQuantity(Number.NaN, 10)).toBe(1);
    const c = priceCart([{ slug: "halo-bordslampa", variantId: "krita-l", quantity: 9 }]); // 3 in stock
    expect(c.lines[0].quantity).toBe(3);
  });

  it("merges duplicate lines", () => {
    expect(normaliseLines([lamp, lamp])).toEqual([{ ...lamp, quantity: 2 }]);
  });
});

describe("suggestAddOn", () => {
  it("suggests the lamp's bulb until it's in the cart", () => {
    expect(suggestAddOn(priceCart([lamp]))?.product.slug).toBe("led-glodlampa");
    expect(suggestAddOn(priceCart([lamp, bulb]))).toBeNull();
    expect(suggestAddOn(priceCart([bowl]))).toBeNull();
  });
});

describe("checkout line items", () => {
  it("adds up to the cart total before shipping", () => {
    const cart = priceCart([lamp, { ...bulb, quantity: 2 }, bowl]);
    const items = toCheckoutLineItems(cart);
    const sum = items.reduce((s, i) => s + i.price_data.unit_amount * i.quantity, 0);
    expect(sum).toBe(cart.total - cart.shipping);
    expect(items.find((i) => i.price_data.product_data.name.includes("paketpris"))?.quantity).toBe(1);
  });

  it("validates the request body", () => {
    expect(parseCheckoutBody({ lines: [lamp] })).toEqual([lamp]);
    expect(parseCheckoutBody({ lines: [] })).toBeNull();
    expect(parseCheckoutBody({ lines: [{ ...lamp, quantity: 1.5 }] })).toBeNull();
    expect(parseCheckoutBody({ lines: [{ ...lamp, price: 1 }] })).toEqual([lamp]); // extra fields ignored
    expect(parseCheckoutBody(null)).toBeNull();
  });
});

describe("formatPrice", () => {
  it("formats öre as Swedish kronor", () => {
    expect(formatPrice(149500).replace(/\s/g, " ")).toBe("1 495 kr");
    expect(formatPrice(9900).replace(/\s/g, " ")).toBe("99 kr");
    expect(formatPrice(12950).replace(/\s/g, " ")).toBe("129,50 kr");
  });
});

describe("set prices", () => {
  const breakfast = [
    { slug: "mugg", variantId: "krita", quantity: 1 },
    { slug: "assiett", variantId: "krita", quantity: 1 },
    { slug: "skalset", variantId: "krita", quantity: 1 },
  ];

  it("charges the set price for one of each", () => {
    const c = priceCart(breakfast);
    expect(c.subtotal - c.discount).toBe(49900);
    expect(c.lines.every((l) => l.discountKind === "set" && l.discountedUnits === 1)).toBe(true);
  });

  it("applies once per complete set", () => {
    const c = priceCart([{ ...breakfast[0], quantity: 2 }, { ...breakfast[1], quantity: 2 }, breakfast[2]]);
    expect(c.discount).toBe(17500 + 14900 + 24500 - 49900);
  });

  it("needs every product of the set", () => {
    expect(priceCart(breakfast.slice(0, 2)).discount).toBe(0);
  });

  it("splits the saving in whole kronor per line", () => {
    const c = priceCart(breakfast);
    expect(c.lines.map((l) => l.total)).toEqual([15300, 13100, 21500]);
  });

  it("splits into whole-öre Stripe lines that add up to the cart", () => {
    const cart = priceCart([...breakfast, { ...breakfast[0], quantity: 1 }]);
    const items = toCheckoutLineItems(cart);
    expect(items.every((i) => Number.isInteger(i.price_data.unit_amount))).toBe(true);
    expect(items.reduce((s, i) => s + i.quantity * i.price_data.unit_amount, 0)).toBe(cart.total - cart.shipping);
    expect(items.some((i) => i.price_data.product_data.name.includes("setpris"))).toBe(true);
  });

  it("lists the sets a product is in, with the saving", () => {
    const [offer] = setsFor("mugg");
    expect(offer.set.id).toBe("frukost");
    expect(offer.saving).toBe(17500 + 14900 + 24500 - 49900);
  });
});
