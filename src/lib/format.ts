import type { Money } from "./types";

const whole = new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", maximumFractionDigits: 0 });
const withOre = new Intl.NumberFormat("sv-SE", { style: "currency", currency: "SEK", minimumFractionDigits: 2 });

/**
 * 129900 → "1 299 kr", 12950 → "129,50 kr". Whole kronor drop the decimals;
 * anything else always shows two. sv-SE output uses non-breaking spaces,
 * which keeps "1 299 kr" from wrapping across lines.
 */
export function formatPrice(amount: Money): string {
  return amount % 100 === 0 ? whole.format(amount / 100) : withOre.format(amount / 100);
}
