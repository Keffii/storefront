import { ImageResponse } from "next/og";
import { getDefaultVariant, getPriceRange } from "@/data/products";
import { findProduct, getCatalog } from "@/lib/server/catalog";
import { formatPrice } from "@/lib/format";
import { OG_SIZE, OgLayout, publicImageDataUri } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Produktbild";

export async function generateStaticParams() {
  return (await getCatalog()).map((p) => ({ slug: p.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const product = await findProduct((await params).slug);
  if (!product) return new ImageResponse(<div style={{ display: "flex" }}>Objekt</div>, OG_SIZE);
  const { min, max } = getPriceRange(product);
  const image = await publicImageDataUri(getDefaultVariant(product).images[0].src);
  return new ImageResponse(
    (
      <OgLayout
        eyebrow={product.tagline}
        title={product.name}
        subtitle={`${min !== max ? "från " : ""}${formatPrice(min)}`}
        image={image}
      />
    ),
    OG_SIZE,
  );
}
