import "server-only";
import type { NextRequest } from "next/server";

/**
 * The public origin of the request. Behind Amplify's CDN the request URL can
 * be an internal one, so prefer the forwarded headers, then SITE_URL.
 */
export function requestOrigin(req: NextRequest): string {
  const envUrl = process.env.SITE_URL;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return `${proto.split(",")[0]}://${host.split(",")[0]}`;
  }
  return envUrl ?? new URL(req.url).origin;
}
