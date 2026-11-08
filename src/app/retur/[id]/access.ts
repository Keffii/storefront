import "server-only";
import { canViewOrder } from "@/lib/accounts";
import { isValidReceiptToken } from "@/lib/receipt-token";
import { getSession } from "@/lib/server/auth";
import { isDbConfigured } from "@/lib/server/config";
import { getOrder, type Order } from "@/lib/server/orders";

/**
 * The return page opens for whoever has the order's signed link (from the
 * confirmation email or guest tracking) or the signed-in account that owns
 * the order. Anything else looks like a missing order.
 */
export async function orderForReturn(id: string, token: string | undefined): Promise<Order | null> {
  if (!/^cs_(test|live)_[A-Za-z0-9]+$/.test(id) || !isDbConfigured()) return null;
  const order = await getOrder(id);
  if (!order) return null;
  if (token && isValidReceiptToken(id, token)) return order;
  const session = await getSession();
  return session && canViewOrder(order, session.sub) ? order : null;
}
