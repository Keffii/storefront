import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { absoluteUrl } from "@/lib/site-url";
import { variantLabel } from "@/lib/variants";
import { getAllProducts } from "./catalog";
import { hashSalt } from "./config";
import { db, DeleteCommand, PutCommand, QueryCommand, table, UpdateCommand } from "./db";
import { button, esc, layout, sendEmail } from "./email";

/*
 * "Bevaka": BIS#<slug>#<variantId>  SUB#<email hash>  email, status pending|active
 * Double opt-in: a subscription only becomes active through the emailed link.
 * When stock returns, active subscribers get one email and the item is deleted.
 * Pending items expire after 7 days, active ones after a year.
 */
const pk = (slug: string, variantId: string) => `BIS#${slug}#${variantId}`;
const emailHash = (email: string) => createHash("sha256").update(hashSalt + email).digest("hex").slice(0, 24);
const sign = (value: string) =>
  createHmac("sha256", process.env.RECEIPT_SECRET ?? hashSalt).update(`bis:${value}`).digest("base64url").slice(0, 32);
const ttl = (days: number) => Math.floor(Date.now() / 1000) + days * 86400;

async function labelFor(slug: string, variantId: string): Promise<string | null> {
  const p = (await getAllProducts()).find((x) => x.slug === slug);
  const v = p?.variants.find((x) => x.id === variantId);
  return p && v ? variantLabel(p, v) : null;
}

export async function subscribeBackInStock(slug: string, variantId: string, rawEmail: string): Promise<boolean> {
  const email = rawEmail.trim().toLowerCase();
  const label = await labelFor(slug, variantId);
  if (!label) return false;
  const h = emailHash(email);
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: { pk: pk(slug, variantId), sk: `SUB#${h}`, type: "back-in-stock", email, status: "pending", ttl: ttl(7), createdAt: new Date().toISOString() },
      // Don't downgrade someone who already confirmed.
      ConditionExpression: "attribute_not_exists(pk) OR #s = :pending",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":pending": "pending" },
    }),
  ).catch((err) => {
    if ((err as { name?: string }).name !== "ConditionalCheckFailedException") throw err;
  });
  const params = new URLSearchParams({ p: slug, v: variantId, e: h, t: sign(`${slug}|${variantId}|${h}`) });
  const link = absoluteUrl(`/bevaka/bekrafta?${params}`);
  const html = layout(
    "Bekräfta bevakningen",
    `Du har bett oss meddela dig när <strong>${esc(label)}</strong> finns i lager igen. Bekräfta med knappen nedan. Har du inte bett om det här kan du strunta i mejlet.`,
    button(link, "Bekräfta bevakning"),
  );
  const text = `Du har bett oss meddela dig när ${label} finns i lager igen. Bekräfta här: ${link}\n\nHar du inte bett om det här kan du strunta i mejlet.`;
  await sendEmail(email, `Bekräfta bevakning av ${label}`, html, text);
  return true;
}

export async function confirmBackInStock(slug: string, variantId: string, h: string, token: string): Promise<string | null> {
  const expected = Buffer.from(sign(`${slug}|${variantId}|${h}`));
  const given = Buffer.from(token);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    await db().send(
      new UpdateCommand({
        TableName: table(),
        Key: { pk: pk(slug, variantId), sk: `SUB#${h}` },
        UpdateExpression: "SET #s = :active, #ttl = :ttl",
        ConditionExpression: "attribute_exists(pk)",
        ExpressionAttributeNames: { "#s": "status", "#ttl": "ttl" },
        ExpressionAttributeValues: { ":active": "active", ":ttl": ttl(365) },
      }),
    );
  } catch {
    return null;
  }
  return labelFor(slug, variantId);
}

/** Emails everyone waiting for this variant, then removes their subscriptions. */
export async function notifyBackInStock(slug: string, variantId: string): Promise<number> {
  const res = await db().send(
    new QueryCommand({ TableName: table(), KeyConditionExpression: "pk = :pk", ExpressionAttributeValues: { ":pk": pk(slug, variantId) } }),
  );
  const active = (res.Items ?? []).filter((i) => i.status === "active");
  if (active.length === 0) return 0;
  const label = (await labelFor(slug, variantId)) ?? slug;
  const link = absoluteUrl(`/produkter/${slug}?variant=${variantId}`);
  const html = layout("Nu finns den igen", `<strong>${esc(label)}</strong> finns i lager igen.`, button(link, "Till produkten"));
  const text = `${label} finns i lager igen: ${link}`;
  for (const item of active) {
    await sendEmail(String(item.email), `${label} finns i lager igen`, html, text);
    await db().send(new DeleteCommand({ TableName: table(), Key: { pk: item.pk, sk: item.sk } }));
  }
  return active.length;
}

/** Confirmed subscribers waiting per variant, for the admin stock page. */
export async function waitingCounts(variants: { slug: string; variantId: string }[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(
    variants.map(async ({ slug, variantId }) => {
      const res = await db().send(
        new QueryCommand({
          TableName: table(),
          KeyConditionExpression: "pk = :pk",
          FilterExpression: "#s = :active",
          ExpressionAttributeNames: { "#s": "status" },
          ExpressionAttributeValues: { ":pk": pk(slug, variantId), ":active": "active" },
          Select: "COUNT",
        }),
      );
      if (res.Count) out[`${slug}:${variantId}`] = res.Count;
    }),
  );
  return out;
}
