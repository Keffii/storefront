import "server-only";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { hashSalt } from "./config";
import { db, table, UpdateCommand } from "./db";

/** The client IP, hashed with a salt so no raw IP address is ever stored. */
export function clientKey(req: NextRequest): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(hashSalt + ip).digest("hex").slice(0, 32);
}

/**
 * Fixed-window rate limit stored in DynamoDB (works across serverless
 * instances, unlike an in-memory counter). Returns true when allowed.
 * Window items expire through the table's TTL.
 */
export async function rateLimit(scope: string, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const window = Math.floor(now / windowSeconds);
  const res = await db().send(
    new UpdateCommand({
      TableName: table(),
      Key: { pk: `RATE#${scope}#${key}`, sk: `WINDOW#${window}` },
      UpdateExpression: "ADD hits :one SET #ttl = if_not_exists(#ttl, :ttl)",
      ExpressionAttributeNames: { "#ttl": "ttl" },
      ExpressionAttributeValues: { ":one": 1, ":ttl": (window + 1) * windowSeconds + 60 },
      ReturnValues: "UPDATED_NEW",
    }),
  );
  return Number(res.Attributes?.hits ?? 0) <= limit;
}
