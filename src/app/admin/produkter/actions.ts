"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { draftToProduct, type DraftErrors, type ProductDraft } from "@/lib/catalog-admin";
import type { ProductImage } from "@/lib/types";
import { requireAdmin } from "@/lib/server/auth";
import { CATALOG_TAG, getAllProducts, saveProduct, slugExists } from "@/lib/server/catalog";
import { uploadProductImage } from "@/lib/server/images";

export type SaveResult = { ok: true; slug: string } | { ok: false; errors: DraftErrors; message?: string };

/**
 * Saves a product from the editor. `originalSlug` is null for a new product.
 * Slugs can't change after creation, so product URLs stay stable.
 */
export async function saveProductAction(draft: ProductDraft, originalSlug: string | null): Promise<SaveResult> {
  await requireAdmin();
  const all = await getAllProducts();
  const previous = originalSlug ? all.find((p) => p.slug === originalSlug) : undefined;
  if (originalSlug && !previous) return { ok: false, errors: {}, message: "Produkten finns inte längre." };
  if (previous && draft.slug !== previous.slug) {
    return { ok: false, errors: { slug: "Adressen kan inte ändras för en befintlig produkt." } };
  }

  const result = draftToProduct(
    draft,
    {
      slugTaken: !previous && (await slugExists(draft.slug)),
      addOnSlugs: all.map((p) => p.slug),
      skuPrefix: previous?.variants[0]?.sku.split("-")[0],
    },
    previous,
  );
  if (!result.ok) return { ok: false, errors: result.errors };

  try {
    await saveProduct(result.product);
  } catch (err) {
    console.error("[admin] save product failed", err);
    return { ok: false, errors: {}, message: "Produkten kunde inte sparas. Försök igen." };
  }
  revalidateTag(CATALOG_TAG);
  revalidatePath("/", "layout");
  return { ok: true, slug: result.product.slug };
}

export type UploadResult = { ok: true; image: ProductImage } | { ok: false; message: string };

export async function uploadImageAction(formData: FormData): Promise<UploadResult> {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const alt = String(formData.get("alt") ?? "");
  const file = formData.get("file");
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return { ok: false, message: "Ange produktens adress innan du laddar upp bilder." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Välj en bildfil." };
  if (!alt.trim()) return { ok: false, message: "Beskriv bilden (alt-text) för skärmläsare." };
  try {
    return { ok: true, image: await uploadProductImage(slug, file, alt) };
  } catch (err) {
    return { ok: false, message: (err as Error).message || "Bilden kunde inte laddas upp." };
  }
}
