/**
 * Returns, refunds and cancellations: the rules, kept pure so they can be
 * unit-tested and shared by the customer pages and the admin.
 *
 * Shipping rule (stated on the return page): the shipping fee is refunded
 * only when everything in the order has been returned.
 */
import { site } from "@/data/products";
import type { Order } from "@/lib/server/orders";
import { shippingMethod } from "./shipping";
import type { Money } from "./types";

export const RETURN_REASONS = {
  angrat: "Ångrat köpet",
  passar_inte: "Passade inte i hemmet",
  skadad: "Skadad vid leverans",
  fel_vara: "Fel vara eller färg",
  annat: "Annat",
} as const;
export type ReturnReason = keyof typeof RETURN_REASONS;

export type ReturnStatus = "requested" | "received" | "refunded" | "rejected";

export interface ReturnItem {
  lineIndex: number;
  quantity: number;
}

export interface OrderReturn {
  id: string; // R-XXXXXX
  createdAt: string;
  status: ReturnStatus;
  items: ReturnItem[];
  reason: ReturnReason;
  comment?: string;
  receivedAt?: string;
  refundedAt?: string;
  refundAmount?: Money;
}

export interface OrderRefund {
  id: string; // Stripe refund id
  at: string;
  amount: Money;
  reason: "return" | "cancellation" | "manual";
  returnId?: string;
}

export type OrderEventType =
  | "shipped"
  | "unshipped"
  | "return_requested"
  | "return_received"
  | "return_rejected"
  | "refunded"
  | "cancelled";

export interface OrderEvent {
  at: string;
  type: OrderEventType;
  note?: string;
}

export const EVENT_LABELS: Record<OrderEventType, string> = {
  shipped: "Skickad",
  unshipped: "Markerad som ej skickad",
  return_requested: "Retur anmäld",
  return_received: "Retur mottagen",
  return_rejected: "Retur avslagen",
  refunded: "Återbetalning",
  cancelled: "Avbruten",
};

export const RETURN_STATUS_LABELS: Record<ReturnStatus, string> = {
  requested: "Anmäld, väntar på paketet",
  received: "Mottagen, återbetalning på väg",
  refunded: "Återbetald",
  rejected: "Avslagen",
};

export function newReturnId(random: () => number = Math.random): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "R-";
  for (let i = 0; i < 6; i++) id += alphabet[Math.floor(random() * alphabet.length)];
  return id;
}

/** Last day to start a return: return window counted from the latest expected delivery. */
export function returnDeadline(order: Pick<Order, "shippedAt" | "delivery">): Date | null {
  if (!order.shippedAt) return null;
  const shipped = new Date(order.shippedAt);
  const days = site.returnDays + shippingMethod(order.delivery?.method).maxDays + 2;
  return new Date(shipped.getTime() + days * 86_400_000);
}

/** Units of each line still open for return (not in a return unless it was rejected). */
export function returnableQuantities(order: Pick<Order, "lines" | "returns">): number[] {
  const left = order.lines.map((l) => l.quantity);
  for (const r of order.returns ?? []) {
    if (r.status === "rejected") continue;
    for (const i of r.items) if (left[i.lineIndex] !== undefined) left[i.lineIndex] -= i.quantity;
  }
  return left.map((n) => Math.max(0, n));
}

export function canStartReturn(order: Order, now = new Date()): boolean {
  if (order.status !== "shipped") return false;
  const deadline = returnDeadline(order);
  return Boolean(deadline && now <= deadline && returnableQuantities(order).some((n) => n > 0));
}

/** Returns an error message, or null when the request is valid. */
export function validateReturn(order: Order, items: ReturnItem[], reason: string, now = new Date()): string | null {
  if (order.status !== "shipped") return "Ordern kan inte returneras än. Den behöver ha skickats först.";
  const deadline = returnDeadline(order);
  if (!deadline || now > deadline) return `Returtiden på ${site.returnDays} dagar har gått ut för den här ordern.`;
  if (!(reason in RETURN_REASONS)) return "Välj en anledning.";
  const wanted = items.filter((i) => i.quantity > 0);
  if (wanted.length === 0) return "Välj minst en vara att returnera.";
  const left = returnableQuantities(order);
  const seen = new Set<number>();
  for (const i of wanted) {
    if (!Number.isInteger(i.lineIndex) || !Number.isInteger(i.quantity) || seen.has(i.lineIndex)) return "Ogiltigt urval.";
    seen.add(i.lineIndex);
    if (left[i.lineIndex] === undefined || i.quantity > left[i.lineIndex]) return "Du kan inte returnera fler än du köpt.";
  }
  return null;
}

/** What the customer paid per unit of a line, after bundle discounts. */
const unitPaid = (order: Pick<Order, "lines">, lineIndex: number) => {
  const l = order.lines[lineIndex];
  return l ? Math.round(l.total / l.quantity) : 0;
};

export const refundedSoFar = (order: Pick<Order, "refunds">) => (order.refunds ?? []).reduce((s, r) => s + r.amount, 0);

/**
 * The suggested refund for a return: the items at the price paid, plus
 * shipping when this return completes a return of the whole order. Never
 * more than what is left to refund.
 */
export function suggestedRefund(order: Order, ret: OrderReturn): Money {
  const items = ret.items.reduce((s, i) => s + unitPaid(order, i.lineIndex) * i.quantity, 0);
  const everythingReturned = returnableQuantities(order).every((n) => n === 0);
  const amount = items + (everythingReturned ? order.shipping : 0);
  return Math.max(0, Math.min(amount, order.total - refundedSoFar(order)));
}

export function canCancel(order: Pick<Order, "status">): boolean {
  return order.status === "paid";
}
