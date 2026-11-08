import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { hashSalt } from "./server/config";

/**
 * Receipt links carry an HMAC of the order id, so anyone with the link (the
 * customer, from their email) can open the receipt, but order ids alone
 * can't be used to read other people's receipts.
 */
const secret = () => process.env.RECEIPT_SECRET ?? hashSalt;

export function receiptToken(orderId: string): string {
  return createHmac("sha256", secret()).update(`receipt:${orderId}`).digest("base64url").slice(0, 32);
}

export function isValidReceiptToken(orderId: string, token: string): boolean {
  const expected = Buffer.from(receiptToken(orderId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const receiptPath = (orderId: string) => `/kvitto/${orderId}?t=${receiptToken(orderId)}`;
