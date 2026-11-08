import "server-only";
import { unstable_cache } from "next/cache";
import { stockKey, type StockMap } from "@/lib/inventory";
import { isDbConfigured } from "./config";
import { db, QueryCommand, table } from "./db";

/*
 * Raw stock levels. Items: pk "INVENTORY", sk "<slug>#<variantId>", qty.
 * One partition, so all stock loads with a single query. A missing item
 * means the variant is still at its catalogue starting stock.
 */
export const INVENTORY_TAG = "inventory";
export const INVENTORY_PK = "INVENTORY";

export async function readStockUncached(): Promise<StockMap> {
  if (!isDbConfigured()) return {};
  const res = await db().send(
    new QueryCommand({
      TableName: table(),
      KeyConditionExpression: "pk = :pk",
      ExpressionAttributeValues: { ":pk": INVENTORY_PK },
    }),
  );
  const map: StockMap = {};
  for (const item of res.Items ?? []) {
    const [slug, variantId] = String(item.sk).split("#");
    map[stockKey(slug, variantId)] = Number(item.qty);
  }
  return map;
}

/** Cached for a minute; refreshed immediately after a sale or an admin change. */
export const getStockMap = unstable_cache(
  async (): Promise<StockMap> => {
    try {
      return await readStockUncached();
    } catch (err) {
      console.warn("[inventory] read failed:", (err as Error).name);
      return {};
    }
  },
  ["inventory"],
  { tags: [INVENTORY_TAG], revalidate: 60 },
);
