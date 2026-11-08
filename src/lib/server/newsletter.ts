import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { absoluteUrl } from "@/lib/site-url";
import { hashSalt } from "./config";
import { db, GetCommand, PutCommand, QueryCommand, table, UpdateCommand } from "./db";
import { button, layout, sendEmail } from "./email";

/*
 * Newsletter: NEWSLETTER  SUB#<email hash>
 *   email, status pending|confirmed|unsubscribed, source, createdAt,
 *   consentAt (when the link was clicked), unsubscribedAt
 * Double opt-in: nobody gets a newsletter until they click the emailed link.
 * Pending sign-ups expire after 7 days. Every newsletter email carries an
 * unsubscribe link that works without signing in.
 */
const PK = "NEWSLETTER";
export const NEWSLETTER_SOURCES = ["footer", "purchase", "account"] as const;
export type NewsletterSource = (typeof NEWSLETTER_SOURCES)[number];

const emailHash = (email: string) => createHash("sha256").update(hashSalt + email).digest("hex").slice(0, 24);
const sign = (purpose: string, h: string) =>
  createHmac("sha256", process.env.RECEIPT_SECRET ?? hashSalt).update(`newsletter:${purpose}:${h}`).digest("base64url").slice(0, 32);
const valid = (purpose: string, h: string, token: string) => {
  const a = Buffer.from(sign(purpose, h));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
};

export function unsubscribeUrl(email: string): string {
  const h = emailHash(email.trim().toLowerCase());
  return absoluteUrl(`/nyhetsbrev/avsluta?e=${h}&t=${sign("unsubscribe", h)}`);
}

/** Footer for every newsletter email (HTML). */
export const unsubscribeFooter = (email: string) =>
  `<p style="margin:24px 0 0;font-size:12px;color:#6b6b6b;">Vill du inte få fler mejl? <a href="${unsubscribeUrl(email)}" style="color:#6b6b6b;">Avsluta prenumerationen</a>.</p>`;

export async function subscribeNewsletter(rawEmail: string, source: NewsletterSource): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const h = emailHash(email);
  const existing = await db().send(new GetCommand({ TableName: table(), Key: { pk: PK, sk: `SUB#${h}` } }));
  // Already confirmed: say nothing new, send nothing (no way to probe who's subscribed).
  if (existing.Item?.status === "confirmed") return;
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: {
        pk: PK,
        sk: `SUB#${h}`,
        type: "newsletter",
        email,
        status: "pending",
        source,
        createdAt: new Date().toISOString(),
        ttl: Math.floor(Date.now() / 1000) + 7 * 86400,
      },
    }),
  );
  const link = absoluteUrl(`/nyhetsbrev/bekrafta?e=${h}&t=${sign("confirm", h)}`);
  const html = layout(
    "Bekräfta prenumerationen",
    "Tack för att du vill ha vårt nyhetsbrev. Klicka på knappen för att bekräfta. Har du inte anmält dig kan du strunta i mejlet, då händer ingenting.",
    button(link, "Bekräfta") + unsubscribeFooter(email),
  );
  const text = `Bekräfta prenumerationen på vårt nyhetsbrev: ${link}\n\nHar du inte anmält dig kan du strunta i mejlet.\n\nAvsluta: ${unsubscribeUrl(email)}`;
  await sendEmail(email, "Bekräfta ditt nyhetsbrev", html, text);
}

export async function confirmNewsletter(h: string, token: string): Promise<boolean> {
  if (!/^[a-f0-9]{24}$/.test(h) || !valid("confirm", h, token)) return false;
  try {
    await db().send(
      new UpdateCommand({
        TableName: table(),
        Key: { pk: PK, sk: `SUB#${h}` },
        UpdateExpression: "SET #s = :c, consentAt = if_not_exists(consentAt, :now) REMOVE #ttl",
        ConditionExpression: "attribute_exists(pk) AND #s <> :u",
        ExpressionAttributeNames: { "#s": "status", "#ttl": "ttl" },
        ExpressionAttributeValues: { ":c": "confirmed", ":u": "unsubscribed", ":now": new Date().toISOString() },
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export async function unsubscribeNewsletter(h: string, token: string): Promise<boolean> {
  if (!/^[a-f0-9]{24}$/.test(h) || !valid("unsubscribe", h, token)) return false;
  try {
    // Keep a record that they said no (without the address), so a later
    // import can't sign them up again by mistake.
    await db().send(
      new UpdateCommand({
        TableName: table(),
        Key: { pk: PK, sk: `SUB#${h}` },
        UpdateExpression: "SET #s = :u, unsubscribedAt = :now REMOVE email",
        ConditionExpression: "attribute_exists(pk)",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: { ":u": "unsubscribed", ":now": new Date().toISOString() },
      }),
    );
  } catch {
    // Not found: already gone, which is what they wanted.
  }
  return true;
}

export async function newsletterCounts(): Promise<{ confirmed: number; pending: number; unsubscribed: number }> {
  const counts = { confirmed: 0, pending: 0, unsubscribed: 0 };
  let start: Record<string, unknown> | undefined;
  do {
    const res = await db().send(
      new QueryCommand({
        TableName: table(),
        KeyConditionExpression: "pk = :p",
        ExpressionAttributeValues: { ":p": PK },
        ProjectionExpression: "#s",
        ExpressionAttributeNames: { "#s": "status" },
        ExclusiveStartKey: start,
      }),
    );
    for (const i of res.Items ?? []) counts[i.status as keyof typeof counts] = (counts[i.status as keyof typeof counts] ?? 0) + 1;
    start = res.LastEvaluatedKey;
  } while (start);
  return counts;
}
