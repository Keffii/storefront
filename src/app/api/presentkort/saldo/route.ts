import { NextResponse, type NextRequest } from "next/server";
import { normaliseGiftCardCode } from "@/lib/gift-cards";
import { isDbConfigured } from "@/lib/server/config";
import { getGiftCard } from "@/lib/server/gift-cards";
import { clientKey, rateLimit } from "@/lib/server/ratelimit";

export const dynamic = "force-dynamic";

/**
 * Balance check for the cart. Rate-limited, and an unknown code, an expired
 * card and an empty card get distinct but non-revealing answers.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? normaliseGiftCardCode(body.code) : null;
  if (!code) return NextResponse.json({ message: "Koden ska se ut som OBJ-XXXX-XXXX." }, { status: 422 });
  if (!isDbConfigured()) return NextResponse.json({ message: "Presentkort fungerar inte i den här miljön." }, { status: 503 });
  if (!(await rateLimit("giftcard-check", clientKey(req), 20, 3600))) {
    return NextResponse.json({ message: "För många försök. Försök igen om en stund." }, { status: 429 });
  }
  const card = await getGiftCard(code);
  if (!card) return NextResponse.json({ message: "Vi hittade inget presentkort med den koden." }, { status: 404 });
  if (new Date(card.expiresAt) <= new Date()) return NextResponse.json({ message: "Presentkortet har gått ut." }, { status: 410 });
  if (card.balance <= 0) return NextResponse.json({ message: "Presentkortet är förbrukat." }, { status: 410 });
  return NextResponse.json({ code, balance: card.balance, expiresAt: card.expiresAt });
}
