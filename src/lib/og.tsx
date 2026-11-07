import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

/** Reads an image from /public as a data URI for use inside ImageResponse. */
export async function publicImageDataUri(src: string): Promise<string | null> {
  try {
    const file = await readFile(join(process.cwd(), "public", src));
    const type = src.endsWith(".svg") ? "image/svg+xml" : src.endsWith(".png") ? "image/png" : "image/jpeg";
    return `data:${type};base64,${file.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Shared layout: text on the left, product image on a cream panel to the right. */
export function OgLayout({ eyebrow, title, subtitle, image }: { eyebrow: string; title: string; subtitle: string; image: string | null }) {
  return (
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#ffffff", color: "#1f1f1f" }}>
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600, padding: 64 }}>
        <div style={{ fontSize: 26, letterSpacing: 8, textTransform: "uppercase" }}>OBJEKT</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ fontSize: 20, letterSpacing: 3, textTransform: "uppercase", color: "#4c4c4c" }}>{eyebrow}</div>
          <div style={{ fontSize: 64, lineHeight: 1.05, fontWeight: 300 }}>{title}</div>
          <div style={{ fontSize: 28, color: "#4c4c4c" }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: 18, color: "#6b6b6b" }}>Portfolio demo: inga riktiga produkter eller betalningar</div>
      </div>
      <div style={{ display: "flex", width: 600, height: 630, background: "#f7f4ef", alignItems: "center", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {image && <img src={image} width={600} height={600} alt="" />}
      </div>
    </div>
  );
}
