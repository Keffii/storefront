import { ImageResponse } from "next/og";
import { site } from "@/data/products";
import { OG_SIZE, OgLayout, publicImageDataUri } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Objekt: föremål för hemmet";

export default async function Image() {
  const image = await publicImageDataUri("/images/products/halo-bordslampa-krita-1.svg");
  return new ImageResponse(
    <OgLayout eyebrow="Webbutik" title={site.tagline} subtitle="Belysning, vaser, möbler och bordsartiklar" image={image} />,
    OG_SIZE,
  );
}
