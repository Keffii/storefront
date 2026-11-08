import "server-only";
import { randomUUID } from "node:crypto";
import { unstable_cache } from "next/cache";
import { summarise, type RatingSummary, type Review, type ReviewInput } from "@/lib/reviews";
import { isDbConfigured } from "./config";
import { BatchGetCommand, db, QueryCommand, table, TransactWriteCommand } from "./db";

export const REVIEWS_TAG = "reviews";

const productPk = (slug: string) => `PRODUCT#${slug}`;

/**
 * Stores a review and bumps the product's summary (count and star sum) in
 * one transaction, so averages never drift from the reviews themselves.
 */
export async function addReview(slug: string, input: ReviewInput, verified = false): Promise<Review> {
  const createdAt = new Date().toISOString();
  const id = randomUUID();
  const review: Review = { id, slug, createdAt, ...input, verified };
  await db().send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Put: {
            TableName: table(),
            Item: { pk: productPk(slug), sk: `REVIEW#${createdAt}#${id}`, type: "review", ...review },
          },
        },
        {
          Update: {
            TableName: table(),
            Key: { pk: productPk(slug), sk: "SUMMARY" },
            UpdateExpression: "ADD reviewCount :one, ratingSum :r",
            ExpressionAttributeValues: { ":one": 1, ":r": input.rating },
          },
        },
      ],
    }),
  );
  return review;
}

/** Removes a review (admin) and takes it out of the summary. */
export async function deleteReview(slug: string, createdAt: string, id: string, rating: number) {
  await db().send(
    new TransactWriteCommand({
      TransactItems: [
        {
          Delete: {
            TableName: table(),
            Key: { pk: productPk(slug), sk: `REVIEW#${createdAt}#${id}` },
            ConditionExpression: "attribute_exists(pk)",
          },
        },
        {
          Update: {
            TableName: table(),
            Key: { pk: productPk(slug), sk: "SUMMARY" },
            UpdateExpression: "ADD reviewCount :minus, ratingSum :r",
            ExpressionAttributeValues: { ":minus": -1, ":r": -rating },
          },
        },
      ],
    }),
  );
}

async function queryReviews(slug: string, limit: number): Promise<Review[]> {
  const res = await db().send(
    new QueryCommand({
      TableName: table(),
      KeyConditionExpression: "pk = :pk AND begins_with(sk, :prefix)",
      ExpressionAttributeValues: { ":pk": productPk(slug), ":prefix": "REVIEW#" },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (res.Items ?? []).map((i) => ({
    id: i.id,
    slug: i.slug,
    name: i.name,
    rating: i.rating,
    title: i.title ?? "",
    body: i.body,
    createdAt: i.createdAt,
    verified: i.verified === true,
  }));
}

async function querySummaries(slugs: string[]): Promise<Record<string, RatingSummary>> {
  const out: Record<string, RatingSummary> = Object.fromEntries(slugs.map((s) => [s, summarise(0, 0)]));
  if (slugs.length === 0) return out;
  const res = await db().send(
    new BatchGetCommand({
      RequestItems: {
        [table()]: { Keys: slugs.map((s) => ({ pk: productPk(s), sk: "SUMMARY" })) },
      },
    }),
  );
  for (const item of res.Responses?.[table()] ?? []) {
    const slug = String(item.pk).replace("PRODUCT#", "");
    out[slug] = summarise(Number(item.reviewCount ?? 0), Number(item.ratingSum ?? 0));
  }
  return out;
}

/** Newest reviews across all products, for moderation in the admin view (uncached). */
export async function listRecentReviews(slugs: string[], limit = 20): Promise<Review[]> {
  const perProduct = await Promise.all(slugs.map((s) => queryReviews(s, limit)));
  return perProduct
    .flat()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

/*
 * Cached readers. Pages using them are statically generated and revalidated;
 * a new review calls revalidateTag(REVIEWS_TAG). Any AWS error (no table, no
 * credentials during the build) yields an empty result instead of a crash.
 */

export const getReviews = unstable_cache(
  async (slug: string, limit = 20): Promise<Review[]> => {
    if (!isDbConfigured()) return [];
    try {
      return await queryReviews(slug, limit);
    } catch (err) {
      console.warn("[reviews] read failed:", (err as Error).name);
      return [];
    }
  },
  ["reviews"],
  { tags: [REVIEWS_TAG], revalidate: 600 },
);

export const getRatingSummaries = unstable_cache(
  async (slugs: string[]): Promise<Record<string, RatingSummary>> => {
    if (!isDbConfigured()) return Object.fromEntries(slugs.map((s) => [s, summarise(0, 0)]));
    try {
      return await querySummaries(slugs);
    } catch (err) {
      console.warn("[reviews] summary read failed:", (err as Error).name);
      return Object.fromEntries(slugs.map((s) => [s, summarise(0, 0)]));
    }
  },
  ["rating-summaries"],
  { tags: [REVIEWS_TAG], revalidate: 600 },
);
