import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  // The test site (NOINDEX=true on the develop branch) must never be crawled,
  // or the shop would appear twice in search results.
  if (process.env.NOINDEX === "true") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/tack", "/designsystem", "/konto", "/kvitto", "/retur"] }],
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
