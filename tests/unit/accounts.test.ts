import { describe, expect, it } from "vitest";
import { products } from "@/data/products";
import { canClaimOrder, canViewOrder, reorderLines, type OrderOwnership } from "@/lib/accounts";
import { stockKey, withStock } from "@/lib/inventory";

const A = "11111111-1111-1111-1111-111111111111";
const B = "22222222-2222-2222-2222-222222222222";

const order = (over: Partial<OrderOwnership> = {}): OrderOwnership => ({
  customerSub: A,
  email: "anna@example.com",
  status: "paid",
  lines: [
    { slug: "halo-bordslampa", variantId: "grafit-s", quantity: 1, name: "Halo bordslampa (Grafit, Liten · 32 cm)" },
    { slug: "led-glodlampa", variantId: "varmvit", quantity: 2, name: "LED-glödlampa E14" },
  ],
  ...over,
});

describe("canViewOrder", () => {
  it("lets only the owning account see an order", () => {
    expect(canViewOrder(order(), A)).toBe(true);
    expect(canViewOrder(order(), B)).toBe(false);
  });

  it("never shows guest orders through the account pages", () => {
    expect(canViewOrder(order({ customerSub: null }), A)).toBe(false);
    expect(canViewOrder(order({ customerSub: undefined }), "")).toBe(false);
  });
});

describe("canClaimOrder", () => {
  const session = { sub: A, email: "Anna@Example.com", emailVerified: true };

  it("allows a guest order with the same verified email", () => {
    expect(canClaimOrder(order({ customerSub: null }), session)).toBe(true);
  });

  it("refuses unverified emails, other emails and orders that already have an owner", () => {
    expect(canClaimOrder(order({ customerSub: null }), { ...session, emailVerified: false })).toBe(false);
    expect(canClaimOrder(order({ customerSub: null, email: "other@example.com" }), session)).toBe(false);
    expect(canClaimOrder(order({ customerSub: B }), session)).toBe(false);
    expect(canClaimOrder(order({ customerSub: null, email: null }), session)).toBe(false);
  });
});

describe("reorderLines", () => {
  it("puts everything back when it's in stock", () => {
    const res = reorderLines(order(), products);
    expect(res.lines).toEqual([
      { slug: "halo-bordslampa", variantId: "grafit-s", quantity: 1 },
      { slug: "led-glodlampa", variantId: "varmvit", quantity: 2 },
    ]);
    expect(res.unavailable).toEqual([]);
  });

  it("leaves out sold-out lines and names them", () => {
    const live = withStock(products, { [stockKey("halo-bordslampa", "grafit-s")]: 0 });
    const res = reorderLines(order(), live);
    expect(res.lines).toEqual([{ slug: "led-glodlampa", variantId: "varmvit", quantity: 2 }]);
    expect(res.unavailable).toEqual(["Halo bordslampa (Grafit, Liten · 32 cm)"]);
  });

  it("drops products that no longer exist", () => {
    const res = reorderLines(order({ lines: [{ slug: "borta", variantId: "x", quantity: 1, name: "Borttagen" }] }), products);
    expect(res.lines).toEqual([]);
    expect(res.unavailable).toEqual(["Borttagen"]);
  });
});
