import type { MetadataRoute } from "next";
import { categories } from "@/data/products";
import { getCatalog } from "@/lib/server/catalog";
import { absoluteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const products = await getCatalog();
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/kollektion"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...categories.map((c) => ({
      url: absoluteUrl(`/kollektion/${c.id}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: absoluteUrl(`/produkter/${p.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    { url: absoluteUrl("/om-projektet"), lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];
}
