import "server-only";
import { unstable_cache } from "next/cache";
import { products as catalog } from "@/data/products";
import { stockKey, withStock, type StockMap } from "@/lib/inventory";
import type { Product } from "@/lib/types";
import { isDbConfigured } from "./config";
import { db, isConditionFailure, QueryCommand, table, UpdateCommand } from "./db";

/*
 * Items: pk "INVENTORY", sk "<slug>#<variantId>", qty.
 * One partition so the whole catalogue's stock loads with a single query.
 * A missing item means "still at the catalogue's starting stock".
 */
export const INVENTORY_TAG = "inventory";
const PK = "INVENTORY";

function seedFor(slug: string, variantId: string): number | undefined {
  return catalog.find((p) => p.slug === slug)?.variants.find((v) => v.id === variantId)?.stock;
}

async function readStock(): Promise<StockMap> {
  const res = await db().send(
    new QueryCommand({ TableName: table(), KeyConditionExpression: "pk = :pk", ExpressionAttributeValues: { ":pk": PK } }),
  );
  const map: StockMap = {};
  for (const item of res.Items ?? []) {
    const [slug, variantId] = String(item.sk).split("#");
    map[stockKey(slug, variantId)] = Number(item.qty);
  }
  return map;
}

/** Live stock, cached for a minute and refreshed immediately after a sale or an admin change. */
export const getStockMap = unstable_cache(
  async (): Promise<StockMap> => {
    if (!isDbConfigured()) return {};
    try {
      return await readStock();
    } catch (err) {
      console.warn("[inventory] read failed:", (err as Error).name);
      return {};
    }
  },
  ["inventory"],
  { tags: [INVENTORY_TAG], revalidate: 60 },
);

/** Uncached read for checkout, where stale stock would oversell. */
export async function getLiveProducts(): Promise<Product[]> {
  if (!isDbConfigured()) return catalog;
  try {
    return withStock(catalog, await readStock());
  } catch {
    return catalog;
  }
}

export async function getProductsWithStock(): Promise<Product[]> {
  return withStock(catalog, await getStockMap());
}

/**
 * Takes `quantity` units out of stock. The conditional write never lets a
 * level go below zero, also when two orders race. Returns false (and leaves
 * stock untouched) when there isn't enough.
 */
export async function decrementStock(slug: string, variantId: string, quantity: number): Promise<boolean> {
  const seed = seedFor(slug, variantId);
  if (seed === undefined) return false;
  try {
    await db().send(
      new UpdateCommand({
        TableName: table(),
        Key: { pk: PK, sk: `${slug}#${variantId}` },
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
  const seed = seedFor(slug, variantId) ?? 0;
  await db().send(
    new UpdateCommand({
      TableName: table(),
      Key: { pk: PK, sk: `${slug}#${variantId}` },
      UpdateExpression: "SET qty = if_not_exists(qty, :seed) + :n, updatedAt = :now",
      ExpressionAttributeValues: { ":seed": seed, ":n": quantity, ":now": new Date().toISOString() },
    }),
  );
}

/** Admin: set an exact level. */
export async function setStock(slug: string, variantId: string, qty: number): Promise<void> {
  if (seedFor(slug, variantId) === undefined) throw new Error("Unknown variant");
  await db().send(
    new UpdateCommand({
      TableName: table(),
      Key: { pk: PK, sk: `${slug}#${variantId}` },
      UpdateExpression: "SET qty = :q, updatedAt = :now",
      ExpressionAttributeValues: { ":q": Math.max(0, Math.floor(qty)), ":now": new Date().toISOString() },
    }),
  );
}
