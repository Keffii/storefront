import "server-only";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { imageSize } from "@/lib/image-size";
import type { ProductImage } from "@/lib/types";
import { backend, isImageStorageConfigured } from "./config";

const MAX_BYTES = 5 * 1024 * 1024;
const CONTENT_TYPES = { png: "image/png", jpeg: "image/jpeg", webp: "image/webp" } as const;

let s3: S3Client | null = null;

/**
 * Uploads a product image to S3 under a new, unguessable key and returns
 * the CloudFront URL with its real dimensions. The file type is read from
 * the bytes, not trusted from the browser.
 */
export async function uploadProductImage(slug: string, file: File, alt: string): Promise<ProductImage> {
  if (!isImageStorageConfigured()) throw new Error("Bildlagring är inte konfigurerad.");
  if (file.size > MAX_BYTES) throw new Error("Bilden får vara högst 5 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const info = imageSize(bytes);
  if (!info) throw new Error("Använd en JPG-, PNG- eller WebP-bild.");
  if (info.width < 400 || info.height < 400) throw new Error("Bilden behöver vara minst 400 × 400 pixlar.");
  const ext = info.type === "jpeg" ? "jpg" : info.type;
  const key = `products/${slug}/${randomUUID()}.${ext}`;
  s3 ??= new S3Client({ region: backend.region });
  await s3.send(
    new PutObjectCommand({
      Bucket: backend.imageBucket!,
      Key: key,
      Body: bytes,
      ContentType: CONTENT_TYPES[info.type],
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return { src: `https://${backend.imageCdnDomain}/${key}`, alt: alt.trim().slice(0, 140), width: info.width, height: info.height };
}
