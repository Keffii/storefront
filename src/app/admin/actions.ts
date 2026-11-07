"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/server/auth";
import { setOrderStatus } from "@/lib/server/orders";
import { deleteReview, REVIEWS_TAG } from "@/lib/server/reviews";

/** Every action re-checks the admin session: server actions are public endpoints. */

export async function markShipped(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id.startsWith("cs_")) throw new Error("Invalid order id");
  await setOrderStatus(id, "shipped", ["paid"]);
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
