import { describe, expect, it } from "vitest";
import { site } from "@/data/products";
import { priceCart } from "@/lib/cart";
import { parseDelivery } from "@/lib/checkout";
import { demoPickupPoints, isPostalCode } from "@/lib/pickup-points";
import {
  canCancel,
  canStartReturn,
  newReturnId,
  returnableQuantities,
  returnDeadline,
  suggestedRefund,
  validateReturn,
  type OrderReturn,
} from "@/lib/returns";
import { normaliseTrackingNumber, shippingFee, shippingMethod, trackingLink } from "@/lib/shipping";
import type { Order } from "@/lib/server/orders";

const bowl = { slug: "lag-skal", variantId: "krita", quantity: 1 }; // 395 kr
const lamp = { slug: "halo-bordslampa", variantId: "grafit-s", quantity: 1 }; // 1 495 kr

describe("shipping methods", () => {
  it("keeps ombud as the default with the old price", () => {
    expect(priceCart([bowl]).shipping).toBe(site.shippingFee);
    expect(priceCart([bowl]).shippingMethod).toBe("ombud");
  });

  it("charges each method's fee below the threshold", () => {
    expect(priceCart([bowl], undefined, "hem").shipping).toBe(7900);
    expect(priceCart([bowl], undefined, "express").shipping).toBe(14900);
  });

  it("makes ombud and hemleverans free over the threshold, but not express", () => {
    expect(priceCart([lamp], undefined, "ombud").shipping).toBe(0);
    expect(priceCart([lamp], undefined, "hem").shipping).toBe(0);
    expect(priceCart([lamp], undefined, "express").shipping).toBe(14900);
    expect(priceCart([lamp], undefined, "express").total).toBe(149500 + 14900);
  });

  it("ships an empty cart for free", () => {
    expect(shippingFee(shippingMethod("express"), 0, true)).toBe(0);
  });

  it("falls back to ombud for unknown ids", () => {
    expect(shippingMethod("drone").id).toBe("ombud");
  });
});

describe("parseDelivery", () => {
  it("defaults when the body has no delivery", () => {
    expect(parseDelivery({ lines: [] })).toEqual({ method: "ombud", pickupPointId: null });
  });
  it("keeps the pickup point only for ombud", () => {
    expect(parseDelivery({ delivery: { method: "ombud", pickupPointId: "demo-116" } })).toEqual({ method: "ombud", pickupPointId: "demo-116" });
    expect(parseDelivery({ delivery: { method: "hem", pickupPointId: "demo-116" } })).toEqual({ method: "hem", pickupPointId: null });
  });
  it("rejects unknown methods and odd ids", () => {
    expect(parseDelivery({ delivery: { method: "drone" } })).toBeNull();
    expect(parseDelivery({ delivery: { method: "ombud", pickupPointId: 5 } })).toBeNull();
    expect(parseDelivery({ delivery: "ombud" })).toBeNull();
  });
});

describe("pickup points (demo provider)", () => {
  it("sorts by closeness to the postal code", async () => {
    const near = await demoPickupPoints.near("117 30", 2);
    expect(near.map((p) => p.id)).toEqual(["demo-117", "demo-116"]);
  });
  it("finds points by id and returns null for unknown ones", async () => {
    expect((await demoPickupPoints.get("demo-171"))?.city).toBe("Solna");
    expect(await demoPickupPoints.get("nope")).toBeNull();
  });
  it("validates Swedish postal codes", () => {
    expect(isPostalCode("116 46")).toBe(true);
    expect(isPostalCode("1164")).toBe(false);
  });
});

describe("tracking", () => {
  it("normalises tracking numbers", () => {
    expect(normaliseTrackingNumber(" ab 123 456 789 se ")).toBe("AB123456789SE");
    expect(normaliseTrackingNumber("12")).toBeNull();
    expect(normaliseTrackingNumber("<script>")).toBeNull();
  });
  it("builds carrier links and ignores unknown carriers", () => {
    expect(trackingLink("postnord", "AB123456789SE")?.url).toBe("https://tracking.postnord.com/se/?id=AB123456789SE");
    expect(trackingLink("ups", "AB123456789SE")).toBeNull();
  });
});

const shippedAt = "2026-11-02T10:00:00.000Z";
function order(over: Partial<Order> = {}): Order {
  return {
    id: "cs_test_abc",
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: shippedAt,
    status: "shipped",
    shippedAt,
    email: "kund@example.com",
    name: "Kund",
    address: null,
    lines: [
      { slug: "lag-skal", variantId: "krita", name: "Låg skål", quantity: 2, unitAmount: 39500, total: 79000 },
      { slug: "led-glodlampa", variantId: "varmvit", name: "LED", quantity: 1, unitAmount: 14900, total: 11900 }, // bundle price
    ],
    subtotal: 90900,
    shipping: 4900,
    total: 95800,
    currency: "sek",
    paymentMethod: "card",
    delivery: { method: "ombud", label: "Ombud" },
    ...over,
  };
}
const ret = (items: OrderReturn["items"], status: OrderReturn["status"] = "received"): OrderReturn => ({
  id: "R-TEST01",
  createdAt: shippedAt,
  status,
  items,
  reason: "angrat",
});

describe("returns", () => {
  const inWindow = new Date("2026-11-20T10:00:00.000Z");
  const tooLate = new Date("2026-12-20T10:00:00.000Z");

  it("counts the window from the latest expected delivery", () => {
    // 30 days + 3 delivery days + 2 days' margin after shipping
    expect(returnDeadline(order())?.toISOString()).toBe("2026-12-07T10:00:00.000Z");
    expect(returnDeadline(order({ shippedAt: undefined }))).toBeNull();
  });

  it("only allows returns of shipped orders within the window", () => {
    expect(canStartReturn(order(), inWindow)).toBe(true);
    expect(canStartReturn(order(), tooLate)).toBe(false);
    expect(canStartReturn(order({ status: "paid" }), inWindow)).toBe(false);
  });

  it("validates quantities against what is still returnable", () => {
    const o = order({ returns: [ret([{ lineIndex: 0, quantity: 1 }], "requested")] });
    expect(returnableQuantities(o)).toEqual([1, 1]);
    expect(validateReturn(o, [{ lineIndex: 0, quantity: 2 }], "angrat", inWindow)).toMatch(/fler än/);
    expect(validateReturn(o, [{ lineIndex: 0, quantity: 1 }], "angrat", inWindow)).toBeNull();
    expect(validateReturn(o, [{ lineIndex: 0, quantity: 0 }], "angrat", inWindow)).toMatch(/minst en/);
    expect(validateReturn(o, [{ lineIndex: 1, quantity: 1 }], "hittepa", inWindow)).toMatch(/anledning/);
    expect(validateReturn(o, [{ lineIndex: 1, quantity: 1 }], "angrat", tooLate)).toMatch(/gått ut/);
  });

  it("frees items again when a return is rejected", () => {
    const o = order({ returns: [ret([{ lineIndex: 0, quantity: 2 }], "rejected")] });
    expect(returnableQuantities(o)).toEqual([2, 1]);
  });

  it("suggests a partial refund at the price paid, without shipping", () => {
    const r = ret([{ lineIndex: 0, quantity: 1 }]);
    expect(suggestedRefund(order({ returns: [r] }), r)).toBe(39500);
  });

  it("uses the bundle price for discounted lines", () => {
    const r = ret([{ lineIndex: 1, quantity: 1 }]);
    expect(suggestedRefund(order({ returns: [r] }), r)).toBe(11900);
  });

  it("adds shipping when the whole order comes back", () => {
    const r = ret([
      { lineIndex: 0, quantity: 2 },
      { lineIndex: 1, quantity: 1 },
    ]);
    expect(suggestedRefund(order({ returns: [r] }), r)).toBe(95800);
  });

  it("never suggests more than is left to refund", () => {
    const first = { ...ret([{ lineIndex: 0, quantity: 2 }], "refunded"), id: "R-FIRST1" };
    const second = ret([{ lineIndex: 1, quantity: 1 }]);
    const o = order({
      returns: [first, second],
      refunds: [{ id: "re_1", at: shippedAt, amount: 90000, reason: "return", returnId: first.id }],
    });
    expect(suggestedRefund(o, second)).toBe(5800);
  });

  it("creates readable return numbers", () => {
    expect(newReturnId(() => 0)).toBe("R-AAAAAA");
    expect(newReturnId()).toMatch(/^R-[A-Z2-9]{6}$/);
  });
});

describe("cancellations", () => {
  it("only cancels paid orders that haven't shipped", () => {
    expect(canCancel({ status: "paid" })).toBe(true);
    expect(canCancel({ status: "shipped" })).toBe(false);
    expect(canCancel({ status: "cancelled" })).toBe(false);
    expect(canCancel({ status: "pending_payment" })).toBe(false);
  });
});

describe("refunds with a promotion code", () => {
  it("refunds the price paid after the code's discount", () => {
    const o = order({
      lines: [{ slug: "lag-skal", variantId: "krita", name: "Låg skål", quantity: 2, unitAmount: 39500, total: 79000, discount: 7900 }],
      subtotal: 79000,
      discount: 7900,
      shipping: 4900,
      total: 76000,
    });
    const r = ret([{ lineIndex: 0, quantity: 1 }]);
    expect(suggestedRefund({ ...o, returns: [r] }, r)).toBe(35550);
  });
});
