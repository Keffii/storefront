import { describe, expect, it } from "vitest";
import {
  giftCardExpiry,
  giftCardReduction,
  maskGiftCardCode,
  MIN_CARD_PAYMENT,
  newGiftCardCode,
  normaliseGiftCardCode,
} from "@/lib/gift-cards";
import { WELCOME_CODE } from "@/lib/promotions";

describe("gift card codes", () => {
  it("generates readable codes without look-alike characters", () => {
    for (let i = 0; i < 50; i++) expect(newGiftCardCode()).toMatch(/^OBJ-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(newGiftCardCode(() => 0)).toBe("OBJ-AAAA-AAAA");
  });

  it("accepts sloppy input and rejects anything else", () => {
    expect(normaliseGiftCardCode(" obj 7k2m qx9p ")).toBe("OBJ-7K2M-QX9P");
    expect(normaliseGiftCardCode("7K2MQX9P")).toBe("OBJ-7K2M-QX9P");
    expect(normaliseGiftCardCode("OBJ-7K2M-QX9")).toBeNull();
    expect(normaliseGiftCardCode("OBJ-0OIL-QX9P")).toBeNull(); // 0, O, I and L are never used
    expect(normaliseGiftCardCode(WELCOME_CODE)).toBeNull();
  });

  it("masks all but the last block", () => {
    expect(maskGiftCardCode("OBJ-7K2M-QX9P")).toBe("OBJ-••••-QX9P");
  });
});

describe("gift card reduction", () => {
  it("covers the order except Stripe's minimum charge", () => {
    expect(giftCardReduction(100000, 44400)).toBe(44400 - MIN_CARD_PAYMENT);
  });
  it("uses the whole balance when the order costs more", () => {
    expect(giftCardReduction(25000, 44400)).toBe(25000);
  });
  it("never goes negative", () => {
    expect(giftCardReduction(25000, 200)).toBe(0);
    expect(giftCardReduction(0, 44400)).toBe(0);
  });
});

it("gift cards are valid for two years", () => {
  expect(giftCardExpiry(new Date("2026-11-08T12:00:00Z")).toISOString()).toBe("2028-11-08T12:00:00.000Z");
});
