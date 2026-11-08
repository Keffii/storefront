import { NextResponse, type NextRequest } from "next/server";
import { isDbConfigured } from "@/lib/server/config";
import { NEWSLETTER_SOURCES, subscribeNewsletter, type NewsletterSource } from "@/lib/server/newsletter";
import { clientKey, rateLimit } from "@/lib/server/ratelimit";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Newsletter sign-up. Always the same answer, so it never reveals who is subscribed. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: unknown; source?: unknown; website?: unknown } | null;
  if (!body) return NextResponse.json({ message: "Ogiltig förfrågan." }, { status: 400 });
  if (typeof body.website === "string" && body.website) return NextResponse.json({ ok: true }); // honeypot
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!EMAIL.test(email) || email.length > 120) return NextResponse.json({ message: "Skriv en giltig e-postadress." }, { status: 422 });
  const source: NewsletterSource = NEWSLETTER_SOURCES.includes(body.source as NewsletterSource)
    ? (body.source as NewsletterSource)
    : "footer";
  if (!isDbConfigured()) return NextResponse.json({ message: "Nyhetsbrevet är inte tillgängligt just nu." }, { status: 503 });
  if (!(await rateLimit("newsletter", clientKey(req), 5, 3600))) {
    return NextResponse.json({ message: "För många försök. Försök igen om en stund." }, { status: 429 });
  }
  await subscribeNewsletter(email, source);
  return NextResponse.json({ ok: true });
}
