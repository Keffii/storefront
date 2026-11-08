import "server-only";
import { notifyBackInStock } from "./back-in-stock";
import { seedStock } from "./catalog";
import { db, isConditionFailure, table, UpdateCommand } from "./db";
import { INVENTORY_PK } from "./stock-store";

export { getStockMap, INVENTORY_TAG } from "./stock-store";

const key = (slug: string, variantId: string) => ({ pk: INVENTORY_PK, sk: `${slug}#${variantId}` });

/**
 * Takes `quantity` units out of stock. The conditional write never lets a
 * level go below zero, also when two orders race. Returns false (and leaves
 * stock untouched) when there isn't enough.
 */
export async function decrementStock(slug: string, variantId: string, quantity: number): Promise<boolean> {
  const seed = await seedStock(slug, variantId);
  if (seed === undefined) return false;
  try {
    await db().send(
      new UpdateCommand({
        TableName: table(),
        Key: key(slug, variantId),
        UpdateExpression: "SET qty = if_not_exists(qty, :seed) - :n, updatedAt = :now",
        ConditionExpression: "(attribute_not_exists(qty) AND :seed >= :n) OR qty >= :n",
        ExpressionAttributeValues: { ":seed": seed, ":n": quantity, ":now": new Date().toISOString() },
      }),
    );
    return true;
  } catch (err) {
    if (isConditionFailure(err)) return false;
    throw err;
  }
}

/** When a variant goes from sold out to in stock, tell whoever is waiting for it. */
async function afterRestock(slug: string, variantId: string, before: number, after: number) {
  if (before <= 0 && after > 0) {
    try {
      await notifyBackInStock(slug, variantId);
    } catch (err) {
      console.warn("[inventory] back-in-stock notify failed:", (err as Error).message);
    }
  }
}

/** Puts units back, e.g. after a cancellation or a return. */
export async function incrementStock(slug: string, variantId: string, quantity: number): Promise<void> {
  const seed = (await seedStock(slug, variantId)) ?? 0;
  const res = await db().send(
    new UpdateCommand({
      TableName: table(),
      Key: key(slug, variantId),
      UpdateExpression: "SET qty = if_not_exists(qty, :seed) + :n, updatedAt = :now",
      ExpressionAttributeValues: { ":seed": seed, ":n": quantity, ":now": new Date().toISOString() },
      ReturnValues: "UPDATED_NEW",
    }),
  );
  const after = Number(res.Attributes?.qty ?? 0);
  await afterRestock(slug, variantId, after - quantity, after);
}

/** Admin: set an exact level. */
export async function setStock(slug: string, variantId: string, qty: number): Promise<void> {
  const seed = await seedStock(slug, variantId);
  if (seed === undefined) throw new Error("Unknown variant");
  const next = Math.max(0, Math.floor(qty));
  const res = await db().send(
    new UpdateCommand({
      TableName: table(),
      Key: key(slug, variantId),
      UpdateExpression: "SET qty = :q, updatedAt = :now",
      ExpressionAttributeValues: { ":q": next, ":now": new Date().toISOString() },
      ReturnValues: "UPDATED_OLD",
    }),
  );
  const before = res.Attributes?.qty === undefined ? seed : Number(res.Attributes.qty);
  await afterRestock(slug, variantId, before, next);
}
