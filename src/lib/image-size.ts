/**
 * Reads width and height from PNG, JPEG and WebP headers, so uploaded
 * product images get correct dimensions for next/image without an image
 * processing library.
 */
export type ImageType = "png" | "jpeg" | "webp";

export function imageSize(buf: Uint8Array): { type: ImageType; width: number; height: number } | null {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // PNG: signature, then IHDR width/height (big-endian) at bytes 16 and 20.
  if (buf.length > 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { type: "png", width: view.getUint32(16), height: view.getUint32(20) };
  }
  // JPEG: walk segments to the first start-of-frame marker.
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) return null;
      const marker = buf[i + 1];
      const len = view.getUint16(i + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { type: "jpeg", height: view.getUint16(i + 5), width: view.getUint16(i + 7) };
      i += 2 + len;
    }
    return null;
  }
  // WebP: RIFF....WEBP, then VP8 / VP8L / VP8X chunk.
  if (buf.length > 30 && String.fromCharCode(...buf.slice(0, 4)) === "RIFF" && String.fromCharCode(...buf.slice(8, 12)) === "WEBP") {
    const chunk = String.fromCharCode(...buf.slice(12, 16));
    if (chunk === "VP8 ") return { type: "webp", width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    if (chunk === "VP8L") {
      const b = view.getUint32(21, true);
      return { type: "webp", width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 };
    }
    if (chunk === "VP8X") {
      const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
      const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
      return { type: "webp", width: w, height: h };
    }
  }
  return null;
}
