import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { findProduct } from "@/lib/server/catalog";
import { validateReview } from "@/lib/reviews";
import { isDbConfigured } from "@/lib/server/config";
import { clientKey, rateLimit } from "@/lib/server/ratelimit";
import { addReview, REVIEWS_TAG } from "@/lib/server/reviews";

export const dynamic = "force-dynamic";

/** Three reviews per visitor per hour is plenty for a real customer. */
const LIMIT = 3;
const WINDOW_SECONDS = 3600;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ message: "Ogiltig förfrågan." }, { status: 400 });

  // Honeypot: a field hidden from people. Bots that fill it get a fake success.
  if (typeof body.website === "string" && body.website.length > 0) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const product = typeof body.slug === "string" ? await findProduct(body.slug) : undefined;
  if (!product) return NextResponse.json({ message: "Produkten finns inte." }, { status: 404 });

  const result = validateReview(body);
  if (!result.ok) return NextResponse.json({ errors: result.errors }, { status: 422 });

  if (!isDbConfigured()) {
    return NextResponse.json({ message: "Recensioner kan inte sparas just nu." }, { status: 503 });
  }

  try {
    if (!(await rateLimit("review", clientKey(req), LIMIT, WINDOW_SECONDS))) {
      return NextResponse.json(
        { message: "Du har skickat flera recensioner på kort tid. Försök igen om en timme." },
        { status: 429 },
      );
    }
    const review = await addReview(product.slug, result.value);
    revalidateTag(REVIEWS_TAG);
    revalidatePath(`/produkter/${product.slug}`);
    return NextResponse.json({ ok: true, review }, { status: 201 });
  } catch (err) {
    console.error("[reviews] save failed", err);
    return NextResponse.json({ message: "Recensionen kunde inte sparas. Försök igen." }, { status: 500 });
  }
}
