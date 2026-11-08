import "server-only";
import { SendEmailCommand, SESv2Client } from "@aws-sdk/client-sesv2";
import { site } from "@/data/products";
import { estimateDelivery, formatDeliveryRange } from "@/lib/delivery";
import { formatPrice } from "@/lib/format";
import { receiptPath, returnPath } from "@/lib/receipt-token";
import { RETURN_REASONS, type OrderReturn } from "@/lib/returns";
import { shippingMethod, trackingLink } from "@/lib/shipping";
import { absoluteUrl } from "@/lib/site-url";
import { vatIncluded } from "@/lib/vat";
import { backend } from "./config";
import type { Order } from "./orders";

/**
 * Order emails through Amazon SES. The SES account is in sandbox mode, so
 * mail only reaches verified addresses; a real shop would request
 * production access. Sending never breaks an order: failures are logged.
 */
const from = () => process.env.EMAIL_FROM ?? null;

let client: SESv2Client | null = null;
const ses = () => (client ??= new SESv2Client({ region: backend.region }));

export const isEmailConfigured = () => Boolean(from());

export async function sendEmail(to: string, subject: string, html: string, text: string): Promise<boolean> {
  const sender = from();
  if (!sender) return false;
  try {
    await ses().send(
      new SendEmailCommand({
        FromEmailAddress: `${site.brandName} <${sender}>`,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject, Charset: "UTF-8" },
            Body: { Html: { Data: html, Charset: "UTF-8" }, Text: { Data: text, Charset: "UTF-8" } },
          },
        },
      }),
    );
    return true;
  } catch (err) {
    console.warn("[email] send failed:", (err as Error).name, (err as Error).message);
    return false;
  }
}

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const orderNumber = (o: Order) => o.id.slice(-8).toUpperCase();

/** Shared layout: plain, table-based HTML that holds up in mail clients. */
export function layout(title: string, intro: string, body: string): string {
  return `<!doctype html><html lang="sv"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f7f4ef;font-family:Helvetica,Arial,sans-serif;color:#1f1f1f;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f4ef;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;">
<tr><td style="padding:28px 28px 8px;font-size:16px;letter-spacing:6px;">OBJEKT</td></tr>
<tr><td style="padding:8px 28px 0;"><h1 style="margin:0 0 12px;font-size:24px;font-weight:300;">${esc(title)}</h1>
<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#4c4c4c;">${intro}</p></td></tr>
<tr><td style="padding:0 28px 24px;">${body}</td></tr>
<tr><td style="padding:16px 28px 28px;border-top:1px solid #f3f3f3;font-size:12px;line-height:1.6;color:#6b6b6b;">
Det här är en portfoliodemo. Inga varor skickas och inga pengar dras.</td></tr>
</table></td></tr></table></body></html>`;
}

function linesTable(o: Order): string {
  const rows = o.lines
    .map(
      (l) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #f3f3f3;font-size:14px;">${l.quantity} × ${esc(l.name)}</td><td align="right" style="padding:8px 0;border-bottom:1px solid #f3f3f3;font-size:14px;white-space:nowrap;">${formatPrice(l.total)}</td></tr>`,
    )
    .join("");
  const row = (label: string, value: string, strong = false) =>
    `<tr><td style="padding:4px 0;font-size:14px;${strong ? "font-weight:bold;" : "color:#4c4c4c;"}">${label}</td><td align="right" style="padding:4px 0;font-size:14px;white-space:nowrap;${strong ? "font-weight:bold;" : ""}">${value}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
${row("Frakt", o.shipping ? formatPrice(o.shipping) : "Fri")}
${row("Totalt", formatPrice(o.total), true)}
${row("Varav moms (25 %)", formatPrice(vatIncluded(o.total)))}</table>`;
}

function address(o: Order): string {
  const p = o.delivery?.pickupPoint;
  const method = o.delivery ? `<p style="margin:20px 0 0;font-size:14px;line-height:1.6;"><strong>Leveranssätt</strong><br>${esc(o.delivery.label)}${p ? `<br>${esc(p.name)}, ${esc(p.street)}, ${esc(`${p.postalCode} ${p.city}`)}<br>Öppet ${esc(p.hours)}` : ""}</p>` : "";
  if (!o.address) return method;
  const a = o.address;
  return `${method}<p style="margin:20px 0 0;font-size:14px;line-height:1.6;"><strong>Leveransadress</strong><br>${esc(o.name ?? "")}<br>${esc(a.line1 ?? "")}${a.line2 ? `<br>${esc(a.line2)}` : ""}<br>${esc(`${a.postalCode ?? ""} ${a.city ?? ""}`)}</p>`;
}

const DEMO_NOTE = "Det här är en portfoliodemo. Inga varor skickas och inga pengar dras.";
const paragraph = (html: string) => `<p style="margin:16px 0 0;font-size:14px;line-height:1.6;">${html}</p>`;

export const button = (href: string, label: string) =>
  `<p style="margin:24px 0 0;"><a href="${href}" style="display:inline-block;padding:12px 20px;background:#1f1f1f;color:#ffffff;text-decoration:none;font-size:13px;letter-spacing:2px;text-transform:uppercase;">${label}</a></p>`;

export function orderConfirmationEmail(o: Order) {
  const estimate = formatDeliveryRange(
    estimateDelivery(new Date(o.createdAt), shippingMethod(o.delivery?.method)),
  );
  const subject = `Orderbekräftelse ${orderNumber(o)}`;
  const intro = `Tack för din beställning! Vi har tagit emot order ${orderNumber(o)}. Beräknad leverans: <strong>${estimate}</strong>.`;
  const html = layout("Tack för din beställning", intro, linesTable(o) + address(o) + button(absoluteUrl(receiptPath(o.id)), "Visa kvitto"));
  const text = [
    `Tack för din beställning! Order ${orderNumber(o)}. Beräknad leverans: ${estimate}.`,
    "",
    ...o.lines.map((l) => `${l.quantity} × ${l.name}  ${formatPrice(l.total)}`),
    `Frakt: ${o.shipping ? formatPrice(o.shipping) : "Fri"}`,
    `Totalt: ${formatPrice(o.total)} (varav moms ${formatPrice(vatIncluded(o.total))})`,
    "",
    `Kvitto: ${absoluteUrl(receiptPath(o.id))}`,
    "",
    "Det här är en portfoliodemo. Inga varor skickas och inga pengar dras.",
  ].join("\n");
  return { subject, html, text };
}

export function shippedEmail(o: Order) {
  const subject = `Din order ${orderNumber(o)} är skickad`;
  const track = trackingLink(o.carrier, o.trackingNumber);
  const intro = `Order ${orderNumber(o)} har lämnat vårt lager och är på väg till dig.${track ? ` Paketet skickas med ${esc(track.label)}, kollinummer ${esc(track.number)}.` : ""}`;
  const html = layout("Din order är skickad", intro, (track ? button(track.url, "Spåra paketet") : "") + linesTable(o) + address(o));
  const text = [
    `Order ${orderNumber(o)} har lämnat vårt lager och är på väg till dig.`,
    track ? `Spåra paketet (${track.label}, ${track.number}): ${track.url}` : "",
    "",
    DEMO_NOTE,
  ].join("\n");
  return { subject, html, text };
}

const returnLines = (o: Order, r: OrderReturn) => r.items.map((i) => `${i.quantity} × ${o.lines[i.lineIndex]?.name ?? "Vara"}`);

export function returnRequestedEmail(o: Order, r: OrderReturn) {
  const subject = `Retur ${r.id} för order ${orderNumber(o)}`;
  const intro = `Vi har tagit emot din returanmälan ${r.id}. Så här gör du:`;
  const steps = `<ol style="margin:16px 0 0;padding-left:20px;font-size:14px;line-height:1.8;">
<li>Packa varorna väl, gärna i originalförpackningen.</li>
<li>Lägg en lapp med returnumret <strong>${r.id}</strong> i paketet.</li>
<li>Lämna paketet hos ett PostNord-ombud. I en riktig butik följer en förbetald returetikett med här.</li>
</ol>`;
  const html = layout(
    "Returen är anmäld",
    intro,
    steps +
      paragraph(`<strong>Varor</strong><br>${returnLines(o, r).map(esc).join("<br>")}<br>Anledning: ${esc(RETURN_REASONS[r.reason])}`) +
      paragraph("Vi återbetalar till samma betalsätt inom några dagar efter att paketet kommit fram.") +
      button(absoluteUrl(returnPath(o.id)), "Visa returen"),
  );
  const text = [intro, `Returnummer: ${r.id}`, ...returnLines(o, r), "", absoluteUrl(returnPath(o.id)), "", DEMO_NOTE].join("\n");
  return { subject, html, text };
}

export function returnReceivedEmail(o: Order, r: OrderReturn) {
  const subject = `Vi har fått din retur ${r.id}`;
  const intro = `Paketet med retur ${r.id} har kommit fram. Återbetalningen behandlas nu.`;
  return { subject, html: layout("Returen har kommit fram", intro, ""), text: `${intro}\n\n${DEMO_NOTE}` };
}

export function refundEmail(o: Order, amount: number, why: string) {
  const subject = `Återbetalning för order ${orderNumber(o)}`;
  const intro = `Vi har återbetalat <strong>${formatPrice(amount)}</strong> (${esc(why)}). Pengarna syns på kontot eller i Klarna-appen inom 5–10 bankdagar.`;
  return {
    subject,
    html: layout("Återbetalningen är gjord", intro, button(absoluteUrl(receiptPath(o.id)), "Visa kvitto")),
    text: `Vi har återbetalat ${formatPrice(amount)} (${why}) för order ${orderNumber(o)}.\n\n${DEMO_NOTE}`,
  };
}

export function cancelledEmail(o: Order) {
  const subject = `Order ${orderNumber(o)} är avbruten`;
  const intro = `Vi har avbrutit order ${orderNumber(o)} och återbetalat <strong>${formatPrice(o.total)}</strong>. Pengarna syns på kontot eller i Klarna-appen inom 5–10 bankdagar.`;
  return {
    subject,
    html: layout("Ordern är avbruten", intro, linesTable(o)),
    text: `Order ${orderNumber(o)} är avbruten och ${formatPrice(o.total)} återbetalas.\n\n${DEMO_NOTE}`,
  };
}

/** Sends one of the templates above to the order's email address. */
export async function sendOrderEmail(o: Order, m: { subject: string; html: string; text: string }): Promise<boolean> {
  if (!o.email) return false;
  return sendEmail(o.email, m.subject, m.html, m.text);
}

export async function sendOrderConfirmation(o: Order): Promise<boolean> {
  if (!o.email) return false;
  const m = orderConfirmationEmail(o);
  return sendEmail(o.email, m.subject, m.html, m.text);
}

export async function sendShippedEmail(o: Order): Promise<boolean> {
  if (!o.email) return false;
  const m = shippedEmail(o);
  return sendEmail(o.email, m.subject, m.html, m.text);
}
