import { NextResponse, type NextRequest } from "next/server";
import { CONTACT_TOPICS, type ContactTopic } from "@/data/service";
import { esc, layout, sendEmail } from "@/lib/server/email";
import { clientKey, rateLimit } from "@/lib/server/ratelimit";

export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const ticketNumber = () => `K-${Array.from({ length: 6 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("")}`;

/**
 * Contact form: emails the shop (CONTACT_TO, or the sender address) with the
 * customer as reply-to, and sends the customer a copy with the ticket number.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ message: "Ogiltig förfrågan." }, { status: 400 });
  if (typeof body.website === "string" && body.website) return NextResponse.json({ ok: true, ticket: ticketNumber() });

  const str = (k: string, max: number) => (typeof body[k] === "string" ? (body[k] as string).trim().slice(0, max) : "");
  const name = str("name", 80);
  const email = str("email", 120);
  const order = str("order", 20).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const message = str("message", 3000);
  const topic = (Object.keys(CONTACT_TOPICS).includes(String(body.topic)) ? body.topic : "annat") as ContactTopic;

  if (!name) return NextResponse.json({ message: "Skriv ditt namn." }, { status: 422 });
  if (!EMAIL.test(email)) return NextResponse.json({ message: "Skriv en giltig e-postadress." }, { status: 422 });
  if (message.length < 10) return NextResponse.json({ message: "Skriv lite mer, minst några ord." }, { status: 422 });

  const to = process.env.CONTACT_TO ?? process.env.EMAIL_FROM;
  if (!to) return NextResponse.json({ message: "Formuläret fungerar inte i den här miljön. Mejla oss i stället." }, { status: 503 });
  if (!(await rateLimit("contact", clientKey(req), 5, 3600))) {
    return NextResponse.json({ message: "För många meddelanden. Försök igen om en stund." }, { status: 429 });
  }

  const ticket = ticketNumber();
  const details = `<p style="margin:16px 0 0;font-size:14px;line-height:1.6;"><strong>Ärende:</strong> ${esc(CONTACT_TOPICS[topic])}<br><strong>Från:</strong> ${esc(name)} &lt;${esc(email)}&gt;${order ? `<br><strong>Order:</strong> ${esc(order)}` : ""}</p><p style="margin:16px 0 0;font-size:14px;line-height:1.6;white-space:pre-wrap;">${esc(message)}</p>`;

  const sent = await sendEmail(
    to,
    `[${ticket}] ${CONTACT_TOPICS[topic]}: ${name}`,
    layout(`Nytt ärende ${ticket}`, "Svara direkt på det här mejlet, så går svaret till kunden.", details),
    `Ärende ${ticket}\n${CONTACT_TOPICS[topic]}\nFrån: ${name} <${email}>${order ? `\nOrder: ${order}` : ""}\n\n${message}`,
    email,
  );
  if (!sent) return NextResponse.json({ message: "Meddelandet kunde inte skickas. Försök igen om en stund." }, { status: 502 });

  // The customer's copy. In SES sandbox mode it only reaches verified addresses; the ticket still exists.
  await sendEmail(
    email,
    `Vi har fått ditt meddelande (${ticket})`,
    layout("Tack för ditt meddelande", `Ditt ärendenummer är <strong>${ticket}</strong>. Vi svarar vanligtvis inom en arbetsdag.`, details),
    `Ditt ärendenummer är ${ticket}. Vi svarar vanligtvis inom en arbetsdag.\n\n${message}`,
  );
  return NextResponse.json({ ok: true, ticket });
}
