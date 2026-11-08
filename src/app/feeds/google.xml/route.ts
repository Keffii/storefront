import { site } from "@/data/products";
import { feedItems, feedXml } from "@/lib/feeds";
import { getCatalogWithStock } from "@/lib/server/catalog";
import { absoluteUrl } from "@/lib/site-url";

/** Google Merchant Center feed. Rebuilt at most every 15 minutes. */
export const revalidate = 900;

export async function GET() {
  const items = feedItems(await getCatalogWithStock(), absoluteUrl);
  const body = feedXml(items, { title: site.brandName, link: absoluteUrl("/"), description: site.tagline });
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
