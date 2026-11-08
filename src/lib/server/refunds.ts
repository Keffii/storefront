import "server-only";
import { refundedSoFar, type OrderRefund } from "@/lib/returns";
import type { Order } from "./orders";
import { stripe } from "./stripe";

/**
 * Refunds part or all of an order in Stripe. The order id is the Checkout
 * Session id, so the payment intent is looked up from it (works for orders
 * stored before payment intents were saved). The idempotency key includes
 * what was refunded before, so retrying after a failed database write
 * returns the same Stripe refund instead of paying out twice.
 */
export async function refundInStripe(
  order: Order,
  amount: number,
  reason: OrderRefund["reason"],
  returnId?: string,
): Promise<OrderRefund> {
  const left = order.total - refundedSoFar(order);
  if (!Number.isInteger(amount) || amount <= 0 || amount > left) throw new Error("Invalid refund amount");
  const session = await stripe().checkout.sessions.retrieve(order.id);
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  if (!paymentIntent) throw new Error("The order has no payment to refund");
  const refund = await stripe().refunds.create(
    {
      payment_intent: paymentIntent,
      amount,
      reason: "requested_by_customer",
      metadata: { orderId: order.id, reason, returnId: returnId ?? "" },
    },
    { idempotencyKey: `refund:${order.id}:${returnId ?? reason}:${amount}:${refundedSoFar(order)}` },
  );
  return { id: refund.id, at: new Date().toISOString(), amount, reason, ...(returnId ? { returnId } : {}) };
}
