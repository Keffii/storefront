"use server";

import { revalidatePath } from "next/cache";
import { newReturnId, validateReturn, type OrderReturn, type ReturnItem, type ReturnReason } from "@/lib/returns";
import { returnRequestedEmail, sendOrderEmail } from "@/lib/server/email";
import { updateOrder } from "@/lib/server/orders";
import { orderForReturn } from "./access";

export type ReturnFormState = { ok: true; returnId: string } | { ok: false; message: string } | null;

export async function requestReturn(_: ReturnFormState, formData: FormData): Promise<ReturnFormState> {
  const id = String(formData.get("id") ?? "");
  const token = String(formData.get("t") ?? "") || undefined;
  const order = await orderForReturn(id, token);
  if (!order) return { ok: false, message: "Ordern hittades inte." };

  const items: ReturnItem[] = order.lines.map((_, lineIndex) => ({
    lineIndex,
    quantity: Number(formData.get(`qty-${lineIndex}`) ?? 0) || 0,
  }));
  const reason = String(formData.get("reason") ?? "");
  const comment = String(formData.get("comment") ?? "").trim().slice(0, 500);

  const error = validateReturn(order, items, reason);
  if (error) return { ok: false, message: error };

  const ret: OrderReturn = {
    id: newReturnId(),
    createdAt: new Date().toISOString(),
    status: "requested",
    items: items.filter((i) => i.quantity > 0),
    reason: reason as ReturnReason,
    ...(comment ? { comment } : {}),
  };
  // Validate again against the stored order inside the locked update, in case
  // two return requests for the same items arrive at once.
  const updated = await updateOrder(id, (o) =>
    validateReturn(o, ret.items, reason)
      ? null
      : {
          ...o,
          returns: [...(o.returns ?? []), ret],
          history: [...(o.history ?? []), { at: ret.createdAt, type: "return_requested", note: ret.id }],
        },
  );
  if (!updated) return { ok: false, message: "Returen kunde inte sparas. Ladda om sidan och försök igen." };

  await sendOrderEmail(updated, returnRequestedEmail(updated, ret));
  revalidatePath(`/admin/ordrar/${id}`);
  return { ok: true, returnId: ret.id };
}
