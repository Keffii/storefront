import "server-only";
import { createHash } from "node:crypto";
import { unstable_cache } from "next/cache";
import { products as seedProducts } from "@/data/products";
import { withStock } from "@/lib/inventory";
import type { Product } from "@/lib/types";
import { isDbConfigured } from "./config";
import { BatchGetCommand, db, PutCommand, QueryCommand, table } from "./db";
import { getStockMap, readStockUncached } from "./stock-store";

/*
 * Products in DynamoDB: pk "CATALOG", sk "PRODUCT#<slug>", data = Product.
 * Until the admin saves the first product the table has no catalogue and
 * the shop reads src/data/products.ts; the first save copies the whole file
 * into the table so the two never mix.
 */
export const CATALOG_TAG = "catalog";
const PK = "CATALOG";

async function readCatalog(): Promise<Product[] | null> {
  const res = await db().send(
    new QueryCommand({ TableName: table(), KeyConditionExpression: "pk = :pk", ExpressionAttributeValues: { ":pk": PK } }),
  );
  const items = (res.Items ?? []).map((i) => i.data as Product);
  if (items.length === 0) return null;
  // Keep a stable order: the order products were created in.
  return items.sort((a, b) => (a as Product & { position?: number }).position! - (b as Product & { position?: number }).position!);
}

const seedVersion = createHash("sha1").update(JSON.stringify(seedProducts)).digest("hex").slice(0, 12);

/** Every product, published or not. Cached; refreshed when the admin saves. */
export const getAllProducts = unstable_cache(
  async (): Promise<Product[]> => {
    if (!isDbConfigured()) return seedProducts;
    try {
      const stored = await readCatalog();
      if (!stored) return seedProducts;
      // Products added to the data file after the first admin save still show up.
      const known = new Set(stored.map((p) => p.slug));
      return [...stored, ...seedProducts.filter((p) => !known.has(p.slug))];
    } catch (err) {
      console.warn("[catalog] read failed:", (err as Error).name);
      return seedProducts;
    }
  },
  // The data file's hash is part of the key: .next/cache survives rebuilds (Amplify keeps it
  // between builds), so without it a deploy could keep serving the old catalogue.
  ["catalog", seedVersion],
  { tags: [CATALOG_TAG], revalidate: 300 },
);

const isPublished = (p: Product) => p.published !== false;

/** What shoppers can see and buy. */
export async function getCatalog(): Promise<Product[]> {
  return (await getAllProducts()).filter(isPublished);
}

/** Published products with live stock (cached stock, refreshed every minute). */
export async function getCatalogWithStock(): Promise<Product[]> {
  return withStock(await getCatalog(), await getStockMap());
}

/** For checkout: published products with stock read straight from the table. */
export async function getLiveProducts(): Promise<Product[]> {
  const catalog = await getCatalog();
  try {
    return withStock(catalog, await readStockUncached());
  } catch {
    return catalog;
  }
}

export async function findProduct(slug: string): Promise<Product | undefined> {
  return (await getCatalog()).find((p) => p.slug === slug);
}

/** Starting stock for a variant (used until the variant first sells). */
export async function seedStock(slug: string, variantId: string): Promise<number | undefined> {
  return (await getAllProducts()).find((p) => p.slug === slug)?.variants.find((v) => v.id === variantId)?.stock;
}

async function putProduct(product: Product, position: number) {
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: { pk: PK, sk: `PRODUCT#${product.slug}`, type: "product", data: { ...product, position }, updatedAt: new Date().toISOString() },
    }),
  );
}

/** Copies the catalogue file into the table the first time the admin saves. */
async function ensureSeeded(): Promise<Product[]> {
  const existing = await readCatalog();
  if (existing) return existing;
  for (const [i, p] of seedProducts.entries()) await putProduct(p, i);
  return seedProducts;
}

export async function saveProduct(product: Product): Promise<void> {
  const current = await ensureSeeded();
  const index = current.findIndex((p) => p.slug === product.slug);
  const position = index >= 0 ? index : current.length;
  await putProduct(product, position);
}

export async function slugExists(slug: string): Promise<boolean> {
  const res = await db().send(
    new BatchGetCommand({ RequestItems: { [table()]: { Keys: [{ pk: PK, sk: `PRODUCT#${slug}` }] } } }),
  );
  if ((res.Responses?.[table()] ?? []).length > 0) return true;
  return seedProducts.some((p) => p.slug === slug);
}
