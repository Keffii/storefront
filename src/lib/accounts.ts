/**
 * Account rules that don't touch AWS, so they can be unit-tested: who may
 * see an order, which guest orders may be claimed, and what "Köp igen" puts
 * back in the cart.
 */
import { priceCart, type CartLine } from "./cart";
import type { Product } from "./types";

export interface OrderOwnership {
  customerSub?: string | null;
  email: string | null;
  status: string;
  lines: { slug: string; variantId: string; quantity: number; name: string }[];
}

/** An order is visible to the customer whose account placed (or claimed) it. Nothing else. */
export function canViewOrder(order: OrderOwnership, sub: string): boolean {
  return Boolean(order.customerSub) && order.customerSub === sub;
}

/**
 * Guest orders can be attached to an account only when the account's email
 * is verified and matches the order's email exactly (case-insensitive), and
 * the order isn't already linked to an account.
 */
export function canClaimOrder(order: OrderOwnership, session: { sub: string; email: string; emailVerified: boolean }): boolean {
  if (!session.emailVerified || order.customerSub) return false;
  return Boolean(order.email) && order.email!.trim().toLowerCase() === session.email.trim().toLowerCase();
}

/** "Köp igen": the order's lines that can be bought now, and the names of those that can't. */
export function reorderLines(order: OrderOwnership, catalog: Product[]): { lines: CartLine[]; unavailable: string[] } {
  const wanted = order.lines
    .filter((l) => l.slug && l.variantId)
    .map((l) => ({ slug: l.slug, variantId: l.variantId, quantity: l.quantity }));
  const priced = priceCart(wanted, catalog);
  const available = new Set(priced.lines.map((l) => `${l.slug}:${l.variantId}`));
  return {
    lines: priced.lines.map((l) => ({ slug: l.slug, variantId: l.variantId, quantity: l.quantity })),
    unavailable: order.lines.filter((l) => !available.has(`${l.slug}:${l.variantId}`)).map((l) => l.name),
  };
}
