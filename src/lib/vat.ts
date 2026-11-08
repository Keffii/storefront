/**
 * Swedish VAT (moms). All prices in the shop include 25 % moms, so the moms
 * part of a price is 25/125 = 20 % of it, rounded to whole öre.
 */
import type { Money } from "./types";

export const VAT_RATE = 0.25;

/** The moms included in a VAT-inclusive amount. 12500 öre → 2500 öre. */
export function vatIncluded(amountInclVat: Money): Money {
  return Math.round((amountInclVat * VAT_RATE) / (1 + VAT_RATE));
}

/** The amount without moms. */
export function amountExclVat(amountInclVat: Money): Money {
  return amountInclVat - vatIncluded(amountInclVat);
}
