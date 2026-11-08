import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isDbConfigured } from "@/lib/server/config";
import { db, GetCommand, PutCommand, table } from "@/lib/server/db";

export const dynamic = "force-dynamic";

const key = (sub: string) => ({ pk: `CUSTOMER#${sub}`, sk: "FAVORITES" });

/** The signed-in customer's saved favourites (product slugs). */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ slugs: [] }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ slugs: [] });
  const res = await db().send(new GetCommand({ TableName: table(), Key: key(session.sub) }));
  return NextResponse.json({ slugs: (res.Item?.slugs as string[] | undefined) ?? [] }, { headers: { "cache-control": "no-store" } });
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  const body = (await req.json().catch(() => null)) as { slugs?: unknown } | null;
  const slugs = Array.isArray(body?.slugs)
    ? [...new Set(body!.slugs.filter((s): s is string => typeof s === "string" && /^[a-z0-9-]{1,60}$/.test(s)))].slice(0, 100)
    : null;
  if (!slugs) return NextResponse.json({ ok: false }, { status: 400 });
  await db().send(new PutCommand({ TableName: table(), Item: { ...key(session.sub), type: "favorites", slugs, updatedAt: new Date().toISOString() } }));
  return NextResponse.json({ ok: true });
}
