import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/auth";
import { isDbConfigured } from "@/lib/server/config";
import { exportCustomerData } from "@/lib/server/customers";
import { rateLimit } from "@/lib/server/ratelimit";

export const dynamic = "force-dynamic";

/** "Ladda ner mina uppgifter": everything stored about the signed-in customer. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ message: "Logga in först." }, { status: 401 });
  if (!isDbConfigured()) return NextResponse.json({ message: "Inte tillgängligt." }, { status: 503 });
  if (!(await rateLimit("export", session.sub, 10, 3600))) {
    return NextResponse.json({ message: "För många nedladdningar. Försök igen senare." }, { status: 429 });
  }
  const data = await exportCustomerData(session);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="objekt-mina-uppgifter.json"`,
      "cache-control": "no-store",
    },
  });
}
