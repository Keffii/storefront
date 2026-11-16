import { NextResponse, type NextRequest } from "next/server";

// Temporary diagnostics for the test site only (NOINDEX=true): shows the
// caller which forwarding headers reach the server, to pick the right one
// for rate limiting. Removed again with the rate-limit fix.
export const dynamic = "force-dynamic";

export function GET(req: NextRequest) {
  if (process.env.NOINDEX !== "true") return new NextResponse(null, { status: 404 });
  const pick = (name: string) => req.headers.get(name);
  return NextResponse.json({
    "x-forwarded-for": pick("x-forwarded-for"),
    "cloudfront-viewer-address": pick("cloudfront-viewer-address"),
    "x-real-ip": pick("x-real-ip"),
    "x-amzn-trace-id": pick("x-amzn-trace-id") ? "present" : null,
    via: pick("via"),
  });
}
