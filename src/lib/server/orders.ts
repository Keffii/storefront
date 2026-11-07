import "server-only";
import type { Money } from "@/lib/types";
import { db, GetCommand, isConditionFailure, PutCommand, QueryCommand, table, UpdateCommand } from "./db";

export type OrderStatus = "pending_payment" | "paid" | "shipped" | "failed";

export interface OrderLine {
  slug: string;
  variantId: string;
  name: string;
  quantity: number;
  unitAmount: Money;
  total: Money;
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
  shipping: Money;
  total: Money;
  currency: string;
  paymentMethod: string | null;
  shippedAt?: string;
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
        Item: { ...key(order.id), gsi1pk: "ORDERS", gsi1sk: order.createdAt, type: "order", ...order },
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
