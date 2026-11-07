import type { Money } from "./types";

const sek = new Intl.NumberFormat("sv-SE", {
  style: "currency",
  currency: "SEK",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * 129900 → "1 299 kr". Whole kronor drop the decimals. sv-SE output uses
 * non-breaking spaces, which keeps "1 299 kr" from wrapping across lines.
 */
export function formatPrice(amount: Money): string {
  return sek.format(amount / 100);
}
