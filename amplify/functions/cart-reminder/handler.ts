import { createHmac } from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { GIVE_UP_AFTER_HOURS, isDue, REMIND_AFTER_HOURS, wantsCartReminders, type ReminderProfile } from "../../../src/lib/cart-reminder";

/*
 * The abandoned-cart reminder. Runs every hour:
 *  1. finds saved carts last changed 3–48 hours ago (gsi1 "CARTS"),
 *  2. re-checks that the customer still wants reminders,
 *  3. marks the cart as reminded with a conditional write, so a retry or an
 *     overlapping run can never send two emails,
 *  4. sends one email with the items and a link back to the cart.
 */
const db = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const ses = new SESv2Client({});

const TABLE = process.env.STOREFRONT_TABLE ?? "";
const FROM = process.env.EMAIL_FROM ?? "";
const SITE = (process.env.SITE_URL ?? "").replace(/\/$/, "");
const SECRET = process.env.RECEIPT_SECRET ?? "";

interface SavedCart {
  pk: string;
  email: string;
  items: { name: string; quantity: number }[];
  updatedAt: string;
  remindedAt?: string | null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const optOutUrl = (sub: string) =>
  `${SITE}/konto/paminnelser/avsluta?u=${sub}&t=${createHmac("sha256", SECRET).update(`cart-reminder-off:${sub}`).digest("base64url").slice(0, 32)}`;

function email(cart: SavedCart, sub: string) {
  const back = `${SITE}/?varukorg=fortsatt`;
  const rows = cart.items
    .map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #f3f3f3;font-size:14px;">${i.quantity} × ${esc(i.name)}</td></tr>`)
    .join("");
  const html = `<!doctype html><html lang="sv"><body style="margin:0;background:#f7f4ef;font-family:Helvetica,Arial,sans-serif;color:#1f1f1f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;">
<tr><td style="padding:28px 28px 8px;font-size:13px;letter-spacing:4px;text-transform:uppercase;">Objekt</td></tr>
<tr><td style="padding:8px 28px 0;font-size:24px;">Dina varor väntar</td></tr>
<tr><td style="padding:12px 28px 0;font-size:14px;line-height:1.6;color:#4c4c4c;">Du lade de här i varukorgen men handlade inte klart. Varukorgen är sparad om du vill fortsätta.</td></tr>
<tr><td style="padding:16px 28px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table></td></tr>
<tr><td style="padding:24px 28px 0;"><a href="${back}" style="display:inline-block;padding:12px 20px;background:#1f1f1f;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Fortsätt handla</a></td></tr>
<tr><td style="padding:24px 28px 28px;font-size:12px;line-height:1.6;color:#6b6b6b;">Vi skickar bara en påminnelse. <a href="${optOutUrl(sub)}" style="color:#6b6b6b;">Stäng av påminnelser</a>. Det här är en portfoliodemo; inga varor skickas och inga pengar dras.</td></tr>
</table></td></tr></table></body></html>`;
  const text = [
    "Dina varor väntar i varukorgen:",
    ...cart.items.map((i) => `${i.quantity} × ${i.name}`),
    "",
    `Fortsätt handla: ${back}`,
    `Stäng av påminnelser: ${optOutUrl(sub)}`,
  ].join("\n");
  return { subject: "Du har varor kvar i varukorgen", html, text };
}

export const handler = async () => {
  if (!TABLE || !FROM || !SITE || !SECRET) {
    console.log("cart-reminder: not configured, skipping");
    return { sent: 0 };
  }
  const now = new Date();
  const from = new Date(now.getTime() - GIVE_UP_AFTER_HOURS * 3_600_000).toISOString();
  const to = new Date(now.getTime() - REMIND_AFTER_HOURS * 3_600_000).toISOString();
  const res = await db.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "gsi1",
      KeyConditionExpression: "gsi1pk = :p AND gsi1sk BETWEEN :from AND :to",
      ExpressionAttributeValues: { ":p": "CARTS", ":from": from, ":to": to },
    }),
  );

  let sent = 0;
  for (const cart of (res.Items ?? []) as SavedCart[]) {
    if (!isDue({ updatedAt: cart.updatedAt, remindedAt: cart.remindedAt, itemCount: cart.items.length }, now)) continue;
    const sub = cart.pk.replace("CUSTOMER#", "");
    const profile = await db.send(new GetCommand({ TableName: TABLE, Key: { pk: cart.pk, sk: "PROFILE" } }));
    if (!profile.Item || !wantsCartReminders(profile.Item.profile as ReminderProfile)) continue;
    try {
      await db.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { pk: cart.pk, sk: "CART" },
          UpdateExpression: "SET remindedAt = :now",
          ConditionExpression: "updatedAt = :seen AND (attribute_not_exists(remindedAt) OR remindedAt = :null)",
          ExpressionAttributeValues: { ":now": now.toISOString(), ":seen": cart.updatedAt, ":null": null },
        }),
      );
    } catch {
      continue; // changed or already reminded in the meantime
    }
    const m = email(cart, sub);
    try {
      await ses.send(
        new SendEmailCommand({
          FromEmailAddress: `Objekt <${FROM}>`,
          Destination: { ToAddresses: [cart.email] },
          Content: {
            Simple: {
              Subject: { Data: m.subject, Charset: "UTF-8" },
              Body: { Html: { Data: m.html, Charset: "UTF-8" }, Text: { Data: m.text, Charset: "UTF-8" } },
            },
          },
        }),
      );
      sent++;
    } catch (err) {
      // SES sandbox rejects unverified recipients; the cart stays marked so it isn't retried.
      console.warn("cart-reminder: send failed", (err as Error).name);
    }
  }
  console.log(`cart-reminder: ${sent} sent`);
  return { sent };
};
