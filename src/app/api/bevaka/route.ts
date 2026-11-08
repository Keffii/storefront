import { NextResponse, type NextRequest } from "next/server";
import { subscribeBackInStock } from "@/lib/server/back-in-stock";
import { getLiveProducts } from "@/lib/server/catalog";
import { isDbConfigured } from "@/lib/server/config";
import { clientKey, rateLimit } from "@/lib/server/ratelimit";

export const dynamic = "force-dynamic";

/** "Bevaka": ask to be emailed when a sold-out variant is back. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { slug?: unknown; variantId?: unknown; email?: unknown; website?: unknown } | null;
  if (!body) return NextResponse.json({ message: "Ogiltig förfrågan." }, { status: 400 });
  if (typeof body.website === "string" && body.website) return NextResponse.json({ ok: true });
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 120) {
    return NextResponse.json({ message: "Skriv en giltig e-postadress." }, { status: 422 });
  }
  if (typeof body.slug !== "string" || typeof body.variantId !== "string") {
    return NextResponse.json({ message: "Ogiltig produkt." }, { status: 400 });
  }
  if (!isDbConfigured()) return NextResponse.json({ message: "Bevakning är inte tillgänglig just nu." }, { status: 503 });

  const variant = (await getLiveProducts()).find((p) => p.slug === body.slug)?.variants.find((v) => v.id === body.variantId);
  if (!variant) return NextResponse.json({ message: "Ogiltig produkt." }, { status: 404 });
  if (variant.stock > 0) return NextResponse.json({ message: "Den finns redan i lager, du kan beställa direkt." }, { status: 409 });

  if (!(await rateLimit("bevaka", clientKey(req), 10, 3600))) {
    return NextResponse.json({ message: "För många försök. Försök igen om en stund." }, { status: 429 });
  }
  await subscribeBackInStock(body.slug, body.variantId, email);
  return NextResponse.json({ ok: true });
}
