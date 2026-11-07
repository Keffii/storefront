import type { MetadataRoute } from "next";
import { categories, products } from "@/data/products";
import { absoluteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: absoluteUrl("/kollektion"), lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...categories.map((c) => ({
      url: absoluteUrl(`/kollektion?kategori=${c.id}`),
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
