import { describe, expect, it } from "vitest";
import { orderConfirmationEmail, shippedEmail } from "@/lib/server/email";
import type { Order } from "@/lib/server/orders";
import { isValidReceiptToken, receiptPath, receiptToken } from "@/lib/receipt-token";
import { amountExclVat, vatIncluded } from "@/lib/vat";

const order: Order = {
  id: "cs_test_a1B2c3D4e5F6g7H8",
  createdAt: "2026-11-10T09:00:00.000Z", // Tuesday 10:00 in Stockholm
  updatedAt: "2026-11-10T09:00:00.000Z",
  status: "paid",
  email: "kund@example.com",
  name: "Anna <script>",
  address: { line1: "Storgatan 1", postalCode: "111 22", city: "Stockholm", country: "SE" },
  lines: [
    { slug: "halo-bordslampa", variantId: "grafit-s", name: "Halo bordslampa (Grafit, Liten · 32 cm)", quantity: 1, unitAmount: 149500, total: 149500 },
    { slug: "led-glodlampa", variantId: "varmvit", name: "LED-glödlampa E14 (paketpris)", quantity: 1, unitAmount: 11900, total: 11900 },
  ],
  subtotal: 161400,
  shipping: 0,
  total: 161400,
  currency: "sek",
  paymentMethod: "card",
};

describe("moms", () => {
  it("takes 20 % of a VAT-inclusive price", () => {
    expect(vatIncluded(12500)).toBe(2500);
    expect(amountExclVat(12500)).toBe(10000);
    expect(vatIncluded(149500)).toBe(29900);
  });

  it("rounds to whole öre and the parts always add up", () => {
    for (const amount of [1, 99, 4900, 39500, 161400, 123457]) {
      expect(vatIncluded(amount) + amountExclVat(amount)).toBe(amount);
      expect(Number.isInteger(vatIncluded(amount))).toBe(true);
    }
  });
});

describe("order emails", () => {
  it("lists the lines, totals, moms and delivery estimate", () => {
    const m = orderConfirmationEmail(order);
    expect(m.subject).toBe("Orderbekräftelse G7H8".replace("G7H8", order.id.slice(-8).toUpperCase()));
    const text = m.text.replace(/ /g, " ");
    expect(text).toContain("1 × Halo bordslampa (Grafit, Liten · 32 cm)  1 495 kr");
    expect(text).toContain("Totalt: 1 614 kr (varav moms 322,80 kr)");
    expect(text).toContain("ons 11 – fre 13 nov");
    expect(m.html).toContain("Visa kvitto");
  });

  it("escapes customer-provided text in HTML", () => {
    const { html } = orderConfirmationEmail(order);
    expect(html).toContain("Anna &lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("has a shipped email", () => {
    expect(shippedEmail(order).subject).toContain("är skickad");
  });
});

describe("receipt links", () => {
  it("accepts only the token for that order", () => {
    const token = receiptToken(order.id);
    expect(isValidReceiptToken(order.id, token)).toBe(true);
    expect(isValidReceiptToken("cs_test_other", token)).toBe(false);
    expect(isValidReceiptToken(order.id, "x".repeat(token.length))).toBe(false);
    expect(receiptPath(order.id)).toBe(`/kvitto/${order.id}?t=${token}`);
  });
});
