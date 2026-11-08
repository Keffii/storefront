"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireAdmin } from "@/lib/server/auth";
import { formatPrice } from "@/lib/format";
import { canCancel, refundedSoFar, type OrderEvent, type OrderReturn } from "@/lib/returns";
import { CARRIERS, isCarrierId, normaliseTrackingNumber } from "@/lib/shipping";
import { cancelledEmail, refundEmail, returnReceivedEmail, sendOrderEmail, sendShippedEmail } from "@/lib/server/email";
import { incrementStock, INVENTORY_TAG, setStock } from "@/lib/server/inventory";
import { getOrder, updateOrder } from "@/lib/server/orders";
import { refundInStripe } from "@/lib/server/refunds";
import { deleteReview, REVIEWS_TAG } from "@/lib/server/reviews";

/** Every action re-checks the admin session: server actions are public endpoints. */

const ORDER_ID = /^cs_(test|live)_[A-Za-z0-9]+$/;

function orderId(formData: FormData): string {
  const id = String(formData.get("id") ?? "");
  if (!ORDER_ID.test(id)) throw new Error("Invalid order id");
  return id;
}

function refreshOrder(id: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/ordrar/${id}`);
}

const event = (type: OrderEvent["type"], note?: string): OrderEvent => ({ at: new Date().toISOString(), type, ...(note ? { note } : {}) });

export async function markShipped(formData: FormData) {
  await requireAdmin();
  const id = orderId(formData);
  const carrier = String(formData.get("carrier") ?? "");
  const trackingNumber = normaliseTrackingNumber(String(formData.get("trackingNumber") ?? ""));
  if (!isCarrierId(carrier) || !trackingNumber) throw new Error("Välj transportör och fyll i ett giltigt kollinummer");
  const now = new Date().toISOString();
  const order = await updateOrder(id, (o) =>
    o.status !== "paid"
      ? null
      : { ...o, status: "shipped", shippedAt: now, carrier, trackingNumber, history: [...(o.history ?? []), event("shipped", `${CARRIERS[carrier].label} ${trackingNumber}`)] },
  );
  if (order) await sendShippedEmail(order);
  refreshOrder(id);
}

export async function markUnshipped(formData: FormData) {
  await requireAdmin();
  const id = orderId(formData);
  await updateOrder(id, (o) =>
    o.status !== "shipped" || (o.returns?.length ?? 0) > 0
      ? null
      : { ...o, status: "paid", shippedAt: undefined, carrier: null, trackingNumber: null, history: [...(o.history ?? []), event("unshipped")] },
  );
  refreshOrder(id);
}

/** Cancels a paid, unshipped order: full refund in Stripe and stock put back. */
export async function cancelOrder(formData: FormData) {
  await requireAdmin();
  const id = orderId(formData);
  const order = await getOrder(id);
  if (!order || !canCancel(order)) throw new Error("Bara betalda ordrar som inte skickats kan avbrytas");
  const left = order.total - refundedSoFar(order);
  const refund = left > 0 ? await refundInStripe(order, left, "cancellation") : null;
  const now = new Date().toISOString();
  const updated = await updateOrder(id, (o) =>
    o.status !== "paid"
      ? null
      : {
          ...o,
          status: "cancelled",
          cancelledAt: now,
          refunds: refund ? [...(o.refunds ?? []), refund] : o.refunds,
          history: [...(o.history ?? []), event("cancelled"), ...(refund ? [event("refunded", formatPrice(refund.amount))] : [])],
        },
  );
  if (updated) {
    for (const l of updated.lines) if (l.slug && l.variantId) await incrementStock(l.slug, l.variantId, l.quantity);
    revalidateTag(INVENTORY_TAG);
    await sendOrderEmail(updated, cancelledEmail(updated));
  }
  refreshOrder(id);
}

/** The return package arrived: put the items back in stock. */
export async function receiveReturn(formData: FormData) {
  await requireAdmin();
  const id = orderId(formData);
  const returnId = String(formData.get("returnId") ?? "");
  const now = new Date().toISOString();
  let received: OrderReturn | undefined;
  const order = await updateOrder(id, (o) => {
    const r = o.returns?.find((x) => x.id === returnId);
    if (!r || r.status !== "requested") return null;
    r.status = "received";
    r.receivedAt = now;
    received = r;
    return { ...o, history: [...(o.history ?? []), event("return_received", returnId)] };
  });
  if (order && received) {
    for (const i of received.items) {
      const l = order.lines[i.lineIndex];
      if (l?.slug && l.variantId) await incrementStock(l.slug, l.variantId, i.quantity);
    }
    revalidateTag(INVENTORY_TAG);
    await sendOrderEmail(order, returnReceivedEmail(order, received));
  }
  refreshOrder(id);
}

export async function rejectReturn(formData: FormData) {
  await requireAdmin();
  const id = orderId(formData);
  const returnId = String(formData.get("returnId") ?? "");
  await updateOrder(id, (o) => {
    const r = o.returns?.find((x) => x.id === returnId);
    if (!r || r.status === "refunded" || r.status === "rejected") return null;
    r.status = "rejected";
    return { ...o, history: [...(o.history ?? []), event("return_rejected", returnId)] };
  });
  refreshOrder(id);
}

/** Refunds a received return, in full or in part (the admin can lower the amount). */
export async function refundReturn(formData: FormData) {
  await requireAdmin();
  const id = orderId(formData);
  const returnId = String(formData.get("returnId") ?? "");
  const amount = Math.round(Number(String(formData.get("amount") ?? "").replace(",", ".")) * 100);
  const order = await getOrder(id);
  const ret = order?.returns?.find((r) => r.id === returnId);
  if (!order || !ret || ret.status !== "received") throw new Error("Returen måste vara mottagen innan den återbetalas");
  const refund = await refundInStripe(order, amount, "return", returnId);
  const updated = await updateOrder(id, (o) => {
    const r = o.returns?.find((x) => x.id === returnId);
    if (!r) return null;
    r.status = "refunded";
    r.refundedAt = refund.at;
    r.refundAmount = refund.amount;
    return { ...o, refunds: [...(o.refunds ?? []), refund], history: [...(o.history ?? []), event("refunded", `${formatPrice(refund.amount)} (${returnId})`)] };
  });
  if (updated) await sendOrderEmail(updated, refundEmail(updated, refund.amount, `retur ${returnId}`));
  refreshOrder(id);
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
