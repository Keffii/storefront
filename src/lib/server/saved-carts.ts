import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { normaliseLines, type CartLine } from "@/lib/cart";
import { remindedAtAfterSave, wantsCartReminders } from "@/lib/cart-reminder";
import { variantLabel } from "@/lib/variants";
import type { CustomerSession } from "./auth";
import { getCatalog } from "./catalog";
import { hashSalt } from "./config";
import { getProfile, saveProfile } from "./customers";
import { db, DeleteCommand, GetCommand, PutCommand, table } from "./db";

/*
 * Saved carts for the abandoned-cart reminder:
 *   CUSTOMER#<sub>  CART   lines, items (names for the email), email,
 *                          updatedAt, remindedAt, gsi1pk "CARTS"
 * Only stored for signed-in customers who want reminders; for everyone else
 * the cart stays in the browser only. The scheduled function in
 * amplify/functions/cart-reminder sends the email.
 */
const key = (sub: string) => ({ pk: `CUSTOMER#${sub}`, sk: "CART" });

export async function getSavedCart(sub: string): Promise<CartLine[]> {
  const res = await db().send(new GetCommand({ TableName: table(), Key: key(sub) }));
  return (res.Item?.lines as CartLine[] | undefined) ?? [];
}

export async function deleteSavedCart(sub: string): Promise<void> {
  await db().send(new DeleteCommand({ TableName: table(), Key: key(sub) }));
}

/** Saves (or removes) the customer's cart. Returns whether it was stored. */
export async function saveCartForReminder(session: CustomerSession, input: CartLine[]): Promise<boolean> {
  const lines = normaliseLines(input).slice(0, 50);
  const profile = await getProfile(session.sub);
  if (lines.length === 0 || !wantsCartReminders(profile)) {
    await deleteSavedCart(session.sub);
    return false;
  }
  const catalog = await getCatalog();
  const items = lines.flatMap((l) => {
    const product = catalog.find((p) => p.slug === l.slug);
    const variant = product?.variants.find((v) => v.id === l.variantId);
    return product && variant ? [{ name: variantLabel(product, variant), quantity: l.quantity, image: variant.images[0].src }] : [];
  });
  if (items.length === 0) {
    await deleteSavedCart(session.sub);
    return false;
  }
  const previous = await db().send(new GetCommand({ TableName: table(), Key: key(session.sub), ProjectionExpression: "remindedAt" }));
  const now = new Date();
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: {
        ...key(session.sub),
        type: "cart",
        lines,
        items,
        email: session.email,
        updatedAt: now.toISOString(),
        remindedAt: remindedAtAfterSave(previous.Item?.remindedAt as string | undefined, now),
        gsi1pk: "CARTS",
        gsi1sk: now.toISOString(),
        // Removed automatically after two weeks either way.
        ttl: Math.floor(now.getTime() / 1000) + 14 * 86400,
      },
    }),
  );
  return true;
}

/* ---------- One-click opt-out from the reminder email ---------- */

const sign = (sub: string) =>
  createHmac("sha256", process.env.RECEIPT_SECRET ?? hashSalt).update(`cart-reminder-off:${sub}`).digest("base64url").slice(0, 32);

export const reminderOptOutToken = sign;

export async function turnOffCartReminders(sub: string, token: string): Promise<boolean> {
  if (!/^[0-9a-f-]{36}$/.test(sub)) return false;
  const expected = Buffer.from(sign(sub));
  const given = Buffer.from(token);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return false;
  const profile = await getProfile(sub);
  await saveProfile(sub, { ...profile, cartReminders: false });
  await deleteSavedCart(sub);
  return true;
}
