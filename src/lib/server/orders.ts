import "server-only";
import type { OrderEvent, OrderReturn, OrderRefund } from "@/lib/returns";
import type { PickupPoint } from "@/lib/pickup-points";
import type { CarrierId, ShippingMethodId } from "@/lib/shipping";
import type { Money } from "@/lib/types";
import { db, GetCommand, isConditionFailure, PutCommand, QueryCommand, table, UpdateCommand } from "./db";

export type OrderStatus = "pending_payment" | "paid" | "shipped" | "failed" | "cancelled";

export interface OrderLine {
  slug: string;
  variantId: string;
  name: string;
  quantity: number;
  unitAmount: Money;
  /** Before promotion-code discounts. */
  total: Money;
  /** This line's share of a promotion-code discount. */
  discount?: Money;
}

export interface Order {
  id: string; // Stripe Checkout Session id
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  email: string | null;
  name: string | null;
  address: {
    line1?: string | null;
    line2?: string | null;
    postalCode?: string | null;
    city?: string | null;
    country?: string | null;
  } | null;
  lines: OrderLine[];
  subtotal: Money;
  /** Promotion-code discount applied in Stripe Checkout. */
  discount?: Money;
  discountCode?: string | null;
  /** Part of the order paid with a gift card (not charged in Stripe). */
  giftCard?: { code: string; amount: Money } | null;
  /** The gift card balance was gone by the time the order was paid. */
  giftCardIssue?: boolean;
  shipping: Money;
  total: Money;
  currency: string;
  paymentMethod: string | null;
  shippedAt?: string;
  /** Variants that couldn't be taken from stock when the order was paid. */
  stockIssues?: string[];
  /** Cognito sub of the account that placed or claimed the order. */
  customerSub?: string | null;
  anonymisedAt?: string;
  delivery?: { method: ShippingMethodId; label: string; pickupPoint?: PickupPoint | null } | null;
  carrier?: CarrierId | null;
  trackingNumber?: string | null;
  returns?: OrderReturn[];
  refunds?: OrderRefund[];
  refundedTotal?: Money;
  cancelledAt?: string;
  history?: OrderEvent[];
}

const key = (id: string) => ({ pk: `ORDER#${id}`, sk: "ORDER" });

/**
 * Saves a new order. Returns false if it already exists – Stripe retries
 * webhooks, and the conditional write makes the handler idempotent.
 */
export async function createOrder(order: Order): Promise<boolean> {
  try {
    await db().send(
      new PutCommand({
        TableName: table(),
        Item: {
          ...key(order.id),
          gsi1pk: "ORDERS",
          gsi1sk: order.createdAt,
          ...(order.customerSub ? { gsi2pk: `CUSTOMER#${order.customerSub}`, gsi2sk: order.createdAt } : {}),
          type: "order",
          ...order,
        },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
    return true;
  } catch (err) {
    if (isConditionFailure(err)) return false;
    throw err;
  }
}

export async function getOrder(id: string): Promise<Order | null> {
  const res = await db().send(new GetCommand({ TableName: table(), Key: key(id) }));
  return (res.Item as Order | undefined) ?? null;
}

export async function listOrders(limit = 100): Promise<Order[]> {
  const res = await db().send(
    new QueryCommand({
      TableName: table(),
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :p",
      ExpressionAttributeValues: { ":p": "ORDERS" },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (res.Items ?? []) as Order[];
}

export async function markStockIssues(id: string, issues: string[]): Promise<void> {
  await db().send(
    new UpdateCommand({
      TableName: table(),
      Key: key(id),
      UpdateExpression: "SET stockIssues = :i",
      ExpressionAttributeValues: { ":i": issues },
    }),
  );
}

/** Moves an order to `next` only from one of the allowed current statuses. */
export async function setOrderStatus(id: string, next: OrderStatus, from: OrderStatus[]): Promise<boolean> {
  const now = new Date().toISOString();
  const values: Record<string, unknown> = { ":next": next, ":now": now };
  from.forEach((s, i) => (values[`:f${i}`] = s));
  try {
    await db().send(
      new UpdateCommand({
        TableName: table(),
        Key: key(id),
        UpdateExpression: `SET #s = :next, updatedAt = :now${next === "shipped" ? ", shippedAt = :now" : ""}`,
        ConditionExpression: `attribute_exists(pk) AND #s IN (${from.map((_, i) => `:f${i}`).join(", ")})`,
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: values,
      }),
    );
    return true;
  } catch (err) {
    if (isConditionFailure(err)) return false;
    throw err;
  }
}

/**
 * Read-modify-write with optimistic locking on updatedAt: two admins (or an
 * admin and a customer) acting at once can't overwrite each other. `mutate`
 * returns the new order, or null to leave it unchanged. Retries a few times.
 */
export async function updateOrder(id: string, mutate: (order: Order) => Order | null): Promise<Order | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await db().send(new GetCommand({ TableName: table(), Key: key(id) }));
    if (!res.Item) return null;
    const current = res.Item as Order & Record<string, unknown>;
    const next = mutate(structuredClone(current));
    if (!next) return null;
    try {
      await db().send(
        new PutCommand({
          TableName: table(),
          Item: { ...current, ...next, ...key(id), updatedAt: new Date().toISOString() },
          ConditionExpression: "updatedAt = :old",
          ExpressionAttributeValues: { ":old": current.updatedAt },
        }),
      );
      return { ...next, updatedAt: new Date().toISOString() };
    } catch (err) {
      if (!isConditionFailure(err)) throw err;
    }
  }
  throw new Error("Order was changed by someone else, try again");
}
