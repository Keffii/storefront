import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { hashSalt } from "./server/config";

/**
 * Receipt links carry an HMAC of the order id, so anyone with the link (the
 * customer, from their email) can open the receipt, but order ids alone
 * can't be used to read other people's receipts.
 */
export function receiptSecret(): string {
  const configured = process.env.RECEIPT_SECRET;
  if (process.env.NODE_ENV === "production") {
    // Fail closed: a missing or short secret would make receipt links guessable.
    if (!configured || configured.length < 32) throw new Error("RECEIPT_SECRET must be set to at least 32 characters in production");
    return configured;
  }
  // Local runs and tests can use the development default.
  return configured || hashSalt;
}

const secret = receiptSecret;

export function receiptToken(orderId: string): string {
  return createHmac("sha256", secret()).update(`receipt:${orderId}`).digest("base64url").slice(0, 32);
}

export function isValidReceiptToken(orderId: string, token: string): boolean {
  const expected = Buffer.from(receiptToken(orderId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export const receiptPath = (orderId: string) => `/kvitto/${orderId}?t=${receiptToken(orderId)}`;

/** The return page accepts the same token: whoever has the receipt link has the order. */
export const returnPath = (orderId: string) => `/retur/${orderId}?t=${receiptToken(orderId)}`;
