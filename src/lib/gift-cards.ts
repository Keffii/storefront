/**
 * Gift card rules, pure so the cart, checkout and tests share them.
 */
import type { Money } from "./types";

export const GIFT_CARD_AMOUNTS: Money[] = [25000, 50000, 100000, 200000];
export const GIFT_CARD_VALID_MONTHS = 24;

/**
 * Stripe's smallest charge in SEK is 3 kr, so a gift card covers the order
 * except for that part. The cart says so instead of hiding it.
 */
export const MIN_CARD_PAYMENT: Money = 300;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** "OBJ-7K2M-QX9P": 8 random characters, easy to read aloud and type. */
export function newGiftCardCode(random: () => number = Math.random): string {
  const pick = () => ALPHABET[Math.floor(random() * ALPHABET.length)];
  const block = () => Array.from({ length: 4 }, pick).join("");
  return `OBJ-${block()}-${block()}`;
}

/** Accepts lower case, spaces and missing dashes. Returns null for anything else. */
export function normaliseGiftCardCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const body = raw.startsWith("OBJ") ? raw.slice(3) : raw;
  if (body.length !== 8 || [...body].some((c) => !ALPHABET.includes(c))) return null;
  return `OBJ-${body.slice(0, 4)}-${body.slice(4)}`;
}

/** How much of `total` a card with `balance` pays. */
export function giftCardReduction(balance: Money, total: Money): Money {
  return Math.max(0, Math.min(balance, total - MIN_CARD_PAYMENT));
}

export const maskGiftCardCode = (code: string) => `OBJ-••••-${code.slice(-4)}`;

export function giftCardExpiry(from: Date): Date {
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() + GIFT_CARD_VALID_MONTHS);
  return d;
}
