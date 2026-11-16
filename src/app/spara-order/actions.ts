"use server";

import { headers } from "next/headers";
import { STATUS_LABELS } from "@/app/admin/status";
import { returnPath } from "@/lib/receipt-token";
import { canStartReturn, type OrderEvent } from "@/lib/returns";
import { trackingLink } from "@/lib/shipping";
import { isDbConfigured } from "@/lib/server/config";
import { listOrders } from "@/lib/server/orders";
import { clientKeyFromHeaders, rateLimit } from "@/lib/server/ratelimit";

export type TrackResult =
  | {
      ok: true;
      order: {
        number: string;
        status: string;
        statusLabel: string;
        createdAt: string;
        shippedAt: string | null;
        cancelledAt: string | null;
        tracking: { label: string; number: string; url: string } | null;
        events: OrderEvent[];
        delivery: string | null;
        returnUrl: string | null;
        hasReturns: boolean;
        items: { name: string; quantity: number }[];
      };
    }
  | { ok: false; message: string };

/**
 * Guest order lookup. Needs both the order number and the email; a wrong
 * pair gets the same answer as a missing order, so nothing can be probed.
 */
export async function trackOrderAction(_: TrackResult | null, formData: FormData): Promise<TrackResult> {
  const number = String(formData.get("number") ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const notFound: TrackResult = { ok: false, message: "Vi hittade ingen order med det ordernumret och den e-postadressen." };
  if (number.length !== 8 || !email.includes("@")) return { ok: false, message: "Fyll i ordernumret (8 tecken) och e-postadressen." };
  if (!isDbConfigured()) return notFound;

  const h = await headers();
  const key = clientKeyFromHeaders(h);
  if (!(await rateLimit("track", key, 20, 3600))) return { ok: false, message: "För många försök. Försök igen om en stund." };

  const order = (await listOrders(500)).find(
    (o) => o.id.slice(-8).toUpperCase() === number && (o.email ?? "").toLowerCase() === email,
  );
  if (!order) return notFound;
  return {
    ok: true,
    order: {
      number,
      status: order.status,
      statusLabel: STATUS_LABELS[order.status],
      createdAt: order.createdAt,
      shippedAt: order.shippedAt ?? null,
      cancelledAt: order.cancelledAt ?? null,
      tracking: trackingLink(order.carrier, order.trackingNumber),
      events: order.history ?? [],
      delivery: order.delivery
        ? `${order.delivery.label}${order.delivery.pickupPoint ? `: ${order.delivery.pickupPoint.name}, ${order.delivery.pickupPoint.street}` : ""}`
        : null,
      // Proving the email is enough to manage the order, like the receipt link in the confirmation.
      returnUrl: canStartReturn(order) || order.returns?.length ? returnPath(order.id) : null,
      hasReturns: Boolean(order.returns?.length),
      items: order.lines.map((l) => ({ name: l.name, quantity: l.quantity })),
    },
  };
}
