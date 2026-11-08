import { feedCsv, feedItems } from "@/lib/feeds";
import { getCatalogWithStock } from "@/lib/server/catalog";
import { absoluteUrl } from "@/lib/site-url";

/** Meta (Facebook/Instagram) catalogue feed. Rebuilt at most every 15 minutes. */
export const revalidate = 900;

export async function GET() {
  const body = feedCsv(feedItems(await getCatalogWithStock(), absoluteUrl));
  return new Response(body, { headers: { "content-type": "text/csv; charset=utf-8" } });
}
