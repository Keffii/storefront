import { NextResponse, type NextRequest } from "next/server";
import { CLIENT_EVENTS, EXPERIMENT_ARMS, type AnalyticsEventName } from "@/lib/analytics-events";
import { CONSENT_COOKIE } from "@/lib/consent";
import { isDbConfigured } from "@/lib/server/config";
import { incrementMetric } from "@/lib/server/metrics";
import { clientKey, rateLimit } from "@/lib/server/ratelimit";

export const dynamic = "force-dynamic";

/**
 * Receives anonymous analytics events and turns them into daily counters.
 * The consent cookie is checked here as well as in the browser.
 */
export async function POST(req: NextRequest) {
  if (req.cookies.get(CONSENT_COOKIE)?.value !== "all") return new NextResponse(null, { status: 204 });
  if (!isDbConfigured()) return new NextResponse(null, { status: 204 });

  const body = (await req.json().catch(() => null)) as { name?: string; arm?: string | null } | null;
  const name = body?.name as AnalyticsEventName | undefined;
  if (!name || !CLIENT_EVENTS.includes(name)) return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  const arm = EXPERIMENT_ARMS.includes(body?.arm as "A" | "B") ? (body!.arm as string) : null;

  try {
    // Generous per-visitor cap so one tab left open can't skew the numbers.
    if (!(await rateLimit("events", clientKey(req), 300, 3600))) return new NextResponse(null, { status: 429 });
    await incrementMetric(name, arm);
  } catch (err) {
    console.warn("[events] failed:", (err as Error).name);
  }
  return new NextResponse(null, { status: 204 });
}
