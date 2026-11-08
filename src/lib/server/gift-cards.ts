import "server-only";
import { giftCardExpiry, newGiftCardCode } from "@/lib/gift-cards";
import type { Money } from "@/lib/types";
import { db, GetCommand, isConditionFailure, PutCommand, QueryCommand, table, UpdateCommand } from "./db";

export interface GiftCard {
  code: string;
  initial: Money;
  balance: Money;
  createdAt: string;
  expiresAt: string;
  purchaseSessionId: string;
  buyerEmail: string | null;
  recipientEmail: string | null;
  recipientName: string | null;
  message: string | null;
}

const key = (code: string) => ({ pk: `GIFTCARD#${code}`, sk: "CARD" });

/**
 * Creates the card for a paid purchase. The session id is reserved first
 * with a conditional write, so Stripe retrying the webhook never issues two
 * cards for one payment. Returns null when this session already has a card.
 */
export async function issueGiftCard(input: Omit<GiftCard, "code" | "balance" | "createdAt" | "expiresAt">): Promise<GiftCard | null> {
  try {
    await db().send(
      new PutCommand({
        TableName: table(),
        Item: { pk: `GIFTCARD_PURCHASE#${input.purchaseSessionId}`, sk: "PURCHASE" },
        ConditionExpression: "attribute_not_exists(pk)",
      }),
    );
  } catch (err) {
    if (isConditionFailure(err)) return null;
    throw err;
  }
  const now = new Date();
  for (let attempt = 0; attempt < 5; attempt++) {
    const card: GiftCard = {
      ...input,
      code: newGiftCardCode(),
      balance: input.initial,
      createdAt: now.toISOString(),
      expiresAt: giftCardExpiry(now).toISOString(),
    };
    try {
      await db().send(
        new PutCommand({
          TableName: table(),
          Item: { ...key(card.code), gsi1pk: "GIFTCARDS", gsi1sk: card.createdAt, type: "giftcard", ...card },
          ConditionExpression: "attribute_not_exists(pk)",
        }),
      );
      return card;
    } catch (err) {
      if (!isConditionFailure(err)) throw err; // code collision: draw again
    }
  }
  throw new Error("Could not create a unique gift card code");
}

export async function getGiftCard(code: string): Promise<GiftCard | null> {
  const res = await db().send(new GetCommand({ TableName: table(), Key: key(code) }));
  return (res.Item as GiftCard | undefined) ?? null;
}

export const isUsable = (card: GiftCard, now = new Date()) => card.balance > 0 && new Date(card.expiresAt) > now;

/** Takes `amount` from the balance, only if it's still there. */
export async function redeemGiftCard(code: string, amount: Money): Promise<boolean> {
  try {
    await db().send(
      new UpdateCommand({
        TableName: table(),
        Key: key(code),
        UpdateExpression: "SET balance = balance - :a",
        ConditionExpression: "attribute_exists(pk) AND balance >= :a",
        ExpressionAttributeValues: { ":a": amount },
      }),
    );
    return true;
  } catch (err) {
    if (isConditionFailure(err)) return false;
    throw err;
  }
}

/** Puts money back, e.g. when an order paid partly by gift card is cancelled. */
export async function restoreGiftCard(code: string, amount: Money): Promise<void> {
  await db().send(
    new UpdateCommand({
      TableName: table(),
      Key: key(code),
      UpdateExpression: "SET balance = balance + :a",
      ConditionExpression: "attribute_exists(pk)",
      ExpressionAttributeValues: { ":a": amount },
    }),
  );
}

export async function listGiftCards(limit = 100): Promise<GiftCard[]> {
  const res = await db().send(
    new QueryCommand({
      TableName: table(),
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :p",
      ExpressionAttributeValues: { ":p": "GIFTCARDS" },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (res.Items ?? []) as GiftCard[];
}
