import { NextResponse, type NextRequest } from "next/server";
import type { CartLine } from "@/lib/cart";
import { getSession } from "@/lib/server/auth";
import { isDbConfigured } from "@/lib/server/config";
import { rateLimit } from "@/lib/server/ratelimit";
import { getSavedCart, saveCartForReminder } from "@/lib/server/saved-carts";

export const dynamic = "force-dynamic";

/** The saved cart, for "Fortsätt handla" from the reminder on another device. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ lines: [] }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ lines: [] });
  return NextResponse.json({ lines: await getSavedCart(session.sub) }, { headers: { "cache-control": "no-store" } });
}

/** Stores the cart for the reminder, only if the customer wants reminders. */
export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  if (!(await rateLimit("cart-save", session.sub, 120, 3600))) return NextResponse.json({ ok: false }, { status: 429 });
  const body = (await req.json().catch(() => null)) as { lines?: unknown } | null;
  if (!Array.isArray(body?.lines)) return NextResponse.json({ ok: false }, { status: 400 });
  const lines = (body.lines as unknown[]).filter(
    (l): l is CartLine =>
      Boolean(l) &&
      typeof (l as CartLine).slug === "string" &&
      typeof (l as CartLine).variantId === "string" &&
      Number.isInteger((l as CartLine).quantity),
  );
  const stored = await saveCartForReminder(session, lines);
  return NextResponse.json({ ok: true, stored });
}
