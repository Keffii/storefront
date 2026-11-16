import "server-only";
import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";
import { hashSalt } from "./config";
import { db, table, UpdateCommand } from "./db";

type HeaderReader = { get(name: string): string | null };

/**
 * The visitor's IP address, from a header the visitor can't forge.
 *
 * On Amplify every request passes CloudFront, which sets
 * CloudFront-Viewer-Address to the connecting address and port
 * ("203.0.113.7:46532", or IPv6 without brackets). X-Forwarded-For is not
 * safe: its first entries are whatever the visitor sent, and its last entry
 * is CloudFront's own edge server, not the visitor. It is only a fallback
 * outside CloudFront (local runs), together with X-Real-IP.
 */
export function clientIp(headers: HeaderReader): string {
  const viewer = headers.get("cloudfront-viewer-address")?.trim();
  if (viewer) {
    const port = viewer.lastIndexOf(":");
    return port > 0 ? viewer.slice(0, port) : viewer;
  }
  const forwarded = headers.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean);
  return forwarded?.at(-1) || headers.get("x-real-ip")?.trim() || "unknown";
}

/** A salted hash of the visitor's IP, so no raw IP address is ever stored. */
export function clientKeyFromHeaders(headers: HeaderReader): string {
  return createHash("sha256").update(hashSalt + clientIp(headers)).digest("hex").slice(0, 32);
}

export function clientKey(req: NextRequest): string {
  return clientKeyFromHeaders(req.headers);
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
