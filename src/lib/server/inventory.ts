import "server-only";
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

/** Puts units back, e.g. after a cancellation or a return. */
export async function incrementStock(slug: string, variantId: string, quantity: number): Promise<void> {
  const seed = (await seedStock(slug, variantId)) ?? 0;
  await db().send(
    new UpdateCommand({
      TableName: table(),
      Key: key(slug, variantId),
      UpdateExpression: "SET qty = if_not_exists(qty, :seed) + :n, updatedAt = :now",
      ExpressionAttributeValues: { ":seed": seed, ":n": quantity, ":now": new Date().toISOString() },
    }),
  );
}

/** Admin: set an exact level. */
export async function setStock(slug: string, variantId: string, qty: number): Promise<void> {
  if ((await seedStock(slug, variantId)) === undefined) throw new Error("Unknown variant");
  await db().send(
    new UpdateCommand({
      TableName: table(),
      Key: key(slug, variantId),
      UpdateExpression: "SET qty = :q, updatedAt = :now",
      ExpressionAttributeValues: { ":q": Math.max(0, Math.floor(qty)), ":now": new Date().toISOString() },
    }),
  );
}
