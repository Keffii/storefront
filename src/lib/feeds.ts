/**
 * Product feeds for Google Merchant Center and Meta (Facebook/Instagram)
 * catalogues. One item per variant, grouped by product with item_group_id,
 * in the RSS 2.0 + g: namespace format both platforms accept.
 */
import { categories, site } from "@/data/products";
import { shippingFee, SHIPPING_METHODS } from "./shipping";
import type { Product, Variant } from "./types";
import { variantLabel } from "./variants";

export interface FeedItem {
  id: string;
  itemGroupId: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks: string[];
  price: string;
  availability: "in_stock" | "out_of_stock";
  brand: string;
  condition: "new";
  identifierExists: "no";
  color?: string;
  size?: string;
  productType: string;
  googleProductCategory: string;
  shippingPrice: string;
}

/** Google's taxonomy ids for the four categories. */
const GOOGLE_CATEGORY: Record<string, string> = {
  belysning: "594", // Home & Garden > Lighting
  vaser: "602", // Home & Garden > Decor > Vases
  mobler: "436", // Furniture
  bordsartiklar: "672", // Home & Garden > Kitchen & Dining > Tableware
};

const sek = (ore: number) => `${(ore / 100).toFixed(2)} SEK`;

export function feedItems(products: Product[], absolute: (path: string) => string): FeedItem[] {
  const cheapest = SHIPPING_METHODS[0];
  return products.flatMap((p) =>
    p.variants.map((v: Variant): FeedItem => {
      const colorLabel = p.options.find((o) => o.id === "color")?.values.find((x) => x.id === v.options.color)?.label;
      const sizeLabel = p.options.find((o) => o.id === "size")?.values.find((x) => x.id === v.options.size)?.label;
      return {
        id: v.sku,
        itemGroupId: p.slug,
        title: variantLabel(p, v).slice(0, 150),
        description: `${p.tagline} ${p.description}`.slice(0, 5000),
        link: absolute(`/produkter/${p.slug}?variant=${v.id}`),
        imageLink: absolute(v.images[0].src),
        additionalImageLinks: v.images.slice(1).map((i) => absolute(i.src)),
        price: sek(v.price),
        availability: v.stock > 0 ? "in_stock" : "out_of_stock",
        brand: site.brandName,
        condition: "new",
        identifierExists: "no",
        color: colorLabel,
        size: sizeLabel,
        productType: categories.find((c) => c.id === p.category)?.name ?? p.category,
        googleProductCategory: GOOGLE_CATEGORY[p.category] ?? "536",
        shippingPrice: sek(shippingFee(cheapest, v.price)),
      };
    }),
  );
}

const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c]!);
const tag = (name: string, value: string | undefined) => (value ? `<g:${name}>${xml(value)}</g:${name}>` : "");

export function feedXml(items: FeedItem[], channel: { title: string; link: string; description: string }): string {
  const body = items
    .map(
      (i) =>
        `<item>${tag("id", i.id)}${tag("item_group_id", i.itemGroupId)}<title>${xml(i.title)}</title><description>${xml(i.description)}</description><link>${xml(i.link)}</link>${tag("image_link", i.imageLink)}${i.additionalImageLinks.map((l) => tag("additional_image_link", l)).join("")}${tag("price", i.price)}${tag("availability", i.availability)}${tag("brand", i.brand)}${tag("condition", i.condition)}${tag("identifier_exists", i.identifierExists)}${tag("color", i.color)}${tag("size", i.size)}${tag("product_type", i.productType)}${tag("google_product_category", i.googleProductCategory)}<g:shipping><g:country>SE</g:country><g:price>${xml(i.shippingPrice)}</g:price></g:shipping></item>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>${xml(channel.title)}</title>
<link>${xml(channel.link)}</link>
<description>${xml(channel.description)}</description>
${body}
</channel>
</rss>
`;
}

/** Meta's CSV catalogue format (the same fields with Meta's column names). */
export function feedCsv(items: FeedItem[]): string {
  const cols = ["id", "item_group_id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand", "color", "size", "product_type", "google_product_category"];
  const cell = (s: string | undefined) => `"${(s ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
  const rows = items.map((i) =>
    [i.id, i.itemGroupId, i.title, i.description, i.availability.replace("_", " "), i.condition, i.price, i.link, i.imageLink, i.brand, i.color, i.size, i.productType, i.googleProductCategory]
      .map(cell)
      .join(","),
  );
  return [cols.join(","), ...rows].join("\n") + "\n";
}
