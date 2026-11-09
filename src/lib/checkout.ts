/**
 * Turns a priced cart into Stripe Checkout line items. Kept free of the
 * Stripe SDK so it can be unit-tested; the route passes the result through.
 */
import type { PricedCart } from "./cart";
import { DEFAULT_SHIPPING_METHOD, isShippingMethodId, type ShippingMethodId } from "./shipping";
import { variantLabel } from "./variants";

export interface CheckoutLineItem {
  quantity: number;
  price_data: {
    currency: "sek";
    unit_amount: number;
    product_data: { name: string; metadata: { slug: string; variantId: string } };
  };
}

/**
 * Stripe has no per-line discounts in price_data, so a line with a bundle
 * discount is split: the discounted units at the bundle price, the rest at
 * full price. The sum always equals the cart total before shipping.
 */
export function toCheckoutLineItems(cart: PricedCart): CheckoutLineItem[] {
  return cart.lines.flatMap((l) => {
    const name = variantLabel(l.product, l.variant);
    const metadata = { slug: l.slug, variantId: l.variantId };
    const item = (quantity: number, unit_amount: number, suffix = ""): CheckoutLineItem => ({
      quantity,
      price_data: { currency: "sek", unit_amount, product_data: { name: name + suffix, metadata } },
    });
    if (l.discountedUnits === 0) return [item(l.quantity, l.unitPrice)];
    const perUnitDiscount = l.discount / l.discountedUnits;
    const items = [item(l.discountedUnits, l.unitPrice - perUnitDiscount, l.discountKind === "set" ? ", setpris" : ", paketpris")];
    const rest = l.quantity - l.discountedUnits;
    if (rest > 0) items.push(item(rest, l.unitPrice));
    return items;
  });
}

/** Validates the JSON body of /api/checkout. */
export function parseCheckoutBody(body: unknown): { slug: string; variantId: string; quantity: number }[] | null {
  if (!body || typeof body !== "object" || !Array.isArray((body as { lines?: unknown }).lines)) return null;
  const lines = (body as { lines: unknown[] }).lines;
  if (lines.length === 0 || lines.length > 50) return null;
  const parsed = [];
  for (const l of lines) {
    if (!l || typeof l !== "object") return null;
    const { slug, variantId, quantity } = l as Record<string, unknown>;
    if (typeof slug !== "string" || typeof variantId !== "string" || typeof quantity !== "number") return null;
    if (slug.length > 80 || variantId.length > 80 || !Number.isInteger(quantity) || quantity < 1) return null;
    parsed.push({ slug, variantId, quantity });
  }
  return parsed;
}

/** Validates the delivery part of the body. Missing means the default method. */
export function parseDelivery(body: unknown): { method: ShippingMethodId; pickupPointId: string | null } | null {
  const d = body && typeof body === "object" ? (body as { delivery?: unknown }).delivery : undefined;
  if (d === undefined || d === null) return { method: DEFAULT_SHIPPING_METHOD, pickupPointId: null };
  if (typeof d !== "object") return null;
  const { method, pickupPointId } = d as Record<string, unknown>;
  if (!isShippingMethodId(method)) return null;
  if (pickupPointId !== null && pickupPointId !== undefined && (typeof pickupPointId !== "string" || pickupPointId.length > 40)) return null;
  return { method, pickupPointId: method === "ombud" && typeof pickupPointId === "string" ? pickupPointId : null };
}
