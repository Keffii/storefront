"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/server/auth";
import { INVENTORY_TAG, setStock } from "@/lib/server/inventory";
import { sendShippedEmail } from "@/lib/server/email";
import { getOrder, setOrderStatus } from "@/lib/server/orders";
import { deleteReview, REVIEWS_TAG } from "@/lib/server/reviews";

/** Every action re-checks the admin session: server actions are public endpoints. */

export async function markShipped(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id.startsWith("cs_")) throw new Error("Invalid order id");
  if (await setOrderStatus(id, "shipped", ["paid"])) {
    const order = await getOrder(id);
    if (order) await sendShippedEmail(order);
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/ordrar/${id}`);
}

export async function markUnshipped(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id.startsWith("cs_")) throw new Error("Invalid order id");
  await setOrderStatus(id, "paid", ["shipped"]);
  revalidatePath("/admin");
  revalidatePath(`/admin/ordrar/${id}`);
}

export async function updateStock(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const variantId = String(formData.get("variantId") ?? "");
  const qty = Number(formData.get("qty"));
  if (!slug || !variantId || !Number.isFinite(qty) || qty < 0 || qty > 9999) throw new Error("Invalid stock");
  await setStock(slug, variantId, qty);
  revalidateTag(INVENTORY_TAG);
  revalidatePath("/admin/lager");
}

export async function removeReview(formData: FormData) {
  await requireAdmin();
  const slug = String(formData.get("slug") ?? "");
  const createdAt = String(formData.get("createdAt") ?? "");
  const id = String(formData.get("id") ?? "");
  const rating = Number(formData.get("rating"));
  if (!slug || !createdAt || !id || !(rating >= 1 && rating <= 5)) throw new Error("Invalid review");
  await deleteReview(slug, createdAt, id, rating);
  revalidateTag(REVIEWS_TAG);
  revalidatePath(`/produkter/${slug}`);
  revalidatePath("/admin");
}
