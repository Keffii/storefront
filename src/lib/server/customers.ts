import "server-only";
import { AdminDeleteUserCommand, CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import outputs from "../../../amplify_outputs.json";
import { canClaimOrder } from "@/lib/accounts";
import type { CustomerSession } from "./auth";
import { backend } from "./config";
import { db, GetCommand, PutCommand, QueryCommand, table, TransactWriteCommand, UpdateCommand } from "./db";
import { listOrders, type Order } from "./orders";

/*
 * Customer data:
 *   CUSTOMER#<sub>  PROFILE   name, saved address, marketing consent, cart reminders
 *   CUSTOMER#<sub>  FAVORITES product slugs
 *   CUSTOMER#<sub>  CART      saved cart for the reminder (see saved-carts.ts)
 *   ORDER#<id>      ORDER     gets customerSub + gsi2pk/gsi2sk when linked
 */
export interface Profile {
  name: string;
  address: { line1: string; line2: string; postalCode: string; city: string };
  marketingConsent: { granted: boolean; at: string | null };
  /** One reminder email when a cart is left behind (needs marketing consent). Default on. */
  cartReminders?: boolean;
  stripeCustomerId?: string;
}

const emptyProfile = (): Profile => ({
  name: "",
  address: { line1: "", line2: "", postalCode: "", city: "" },
  marketingConsent: { granted: false, at: null },
});

const profileKey = (sub: string) => ({ pk: `CUSTOMER#${sub}`, sk: "PROFILE" });

export async function getProfile(sub: string): Promise<Profile> {
  const res = await db().send(new GetCommand({ TableName: table(), Key: profileKey(sub) }));
  return { ...emptyProfile(), ...((res.Item?.profile as Profile | undefined) ?? {}) };
}

export async function saveProfile(sub: string, profile: Profile): Promise<void> {
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: { ...profileKey(sub), type: "profile", profile, updatedAt: new Date().toISOString() },
    }),
  );
}

export async function listCustomerOrders(sub: string, limit = 100): Promise<Order[]> {
  const res = await db().send(
    new QueryCommand({
      TableName: table(),
      IndexName: "gsi2",
      KeyConditionExpression: "gsi2pk = :p",
      ExpressionAttributeValues: { ":p": `CUSTOMER#${sub}` },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );
  return (res.Items ?? []) as Order[];
}

/**
 * Guest orders that could be attached to this account. A demo shop has few
 * orders, so this filters the recent order list; a real shop would add an
 * index on the (normalised) email.
 */
export async function findClaimableOrders(session: CustomerSession): Promise<Order[]> {
  if (!session.emailVerified) return [];
  return (await listOrders(500)).filter((o) => canClaimOrder(o, session));
}

/** Attaches the given guest orders, re-checking each one at write time. */
export async function claimOrders(session: CustomerSession, ids: string[]): Promise<number> {
  const claimable = new Map((await findClaimableOrders(session)).map((o) => [o.id, o]));
  let claimed = 0;
  for (const id of ids) {
    const order = claimable.get(id);
    if (!order) continue;
    try {
      await db().send(
        new UpdateCommand({
          TableName: table(),
          Key: { pk: `ORDER#${id}`, sk: "ORDER" },
          UpdateExpression: "SET customerSub = :s, gsi2pk = :p, gsi2sk = :c",
          ConditionExpression: "attribute_exists(pk) AND attribute_not_exists(customerSub)",
          ExpressionAttributeValues: { ":s": session.sub, ":p": `CUSTOMER#${session.sub}`, ":c": order.createdAt },
        }),
      );
      claimed++;
    } catch {
      // Claimed by someone else in the meantime, or gone: skip it.
    }
  }
  return claimed;
}

/** Everything stored about the customer, for "Ladda ner mina uppgifter". */
export async function exportCustomerData(session: CustomerSession) {
  const [profile, orders] = await Promise.all([getProfile(session.sub), listCustomerOrders(session.sub, 1000)]);
  return {
    exportedAt: new Date().toISOString(),
    account: { email: session.email, emailVerified: session.emailVerified },
    profile: {
      name: profile.name,
      address: profile.address,
      marketingConsent: profile.marketingConsent,
      cartReminders: profile.cartReminders !== false,
    },
    orders: orders.map((o) => ({
      order: o.id.slice(-8).toUpperCase(),
      createdAt: o.createdAt,
      status: o.status,
      lines: o.lines.map((l) => ({ name: l.name, quantity: l.quantity, total: l.total / 100 })),
      shipping: o.shipping / 100,
      total: o.total / 100,
      currency: o.currency,
      address: o.address,
    })),
  };
}

/**
 * Deletes the account: the Cognito user and the profile. Orders are kept for
 * bookkeeping but anonymised (name, email and address removed, the link to
 * the account dropped).
 */
export async function deleteCustomer(session: CustomerSession): Promise<void> {
  const orders = await listCustomerOrders(session.sub, 1000);
  for (const o of orders) {
    await db().send(
      new UpdateCommand({
        TableName: table(),
        Key: { pk: `ORDER#${o.id}`, sk: "ORDER" },
        UpdateExpression: "SET #n = :null, email = :null, address = :null, anonymisedAt = :now REMOVE customerSub, gsi2pk, gsi2sk",
        ExpressionAttributeNames: { "#n": "name" },
        ExpressionAttributeValues: { ":null": null, ":now": new Date().toISOString() },
      }),
    );
  }
  await db().send(
    new TransactWriteCommand({
      TransactItems: [
        { Delete: { TableName: table(), Key: profileKey(session.sub) } },
        { Delete: { TableName: table(), Key: { pk: `CUSTOMER#${session.sub}`, sk: "FAVORITES" } } },
        { Delete: { TableName: table(), Key: { pk: `CUSTOMER#${session.sub}`, sk: "CART" } } },
      ],
    }),
  );
  const poolId = (outputs as { auth?: { user_pool_id: string } }).auth?.user_pool_id;
  if (poolId) {
    const cognito = new CognitoIdentityProviderClient({ region: backend.region });
    await cognito.send(new AdminDeleteUserCommand({ UserPoolId: poolId, Username: session.sub }));
  }
}
