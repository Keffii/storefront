/**
 * Customer service content: opening hours (demo values, stated as such) and
 * the questions people ask about orders, returns and accounts. Product
 * questions come from the product data, so nothing is written twice.
 */
import { site } from "./products";
import type { FaqItem } from "@/lib/types";

export const serviceHours = {
  label: "Mån–fre 9–16",
  responseTime: "inom en arbetsdag",
  note: "Öppettiderna och svarstiden är demovärden. Formuläret skickar ett riktigt mejl till den som driver demon.",
};

export const CONTACT_TOPICS = {
  order: "Min order",
  retur: "Retur eller reklamation",
  produkt: "Fråga om en produkt",
  konto: "Mitt konto",
  annat: "Något annat",
} as const;
export type ContactTopic = keyof typeof CONTACT_TOPICS;

export const serviceFaq: (FaqItem & { topic: string })[] = [
  {
    topic: "Order",
    question: "Var är min order?",
    answer: "Under Spåra order fyller du i ordernumret och e-postadressen. När ordern har skickats ser du transportör och en länk för att följa paketet. Har du ett konto ser du alla ordrar under Mitt konto.",
  },
  {
    topic: "Order",
    question: "Kan jag ändra eller avbryta min order?",
    answer: "Så länge ordern inte har skickats kan vi avbryta den och betala tillbaka hela beloppet. Skriv till oss via formuläret nedan med ordernumret.",
  },
  {
    topic: "Retur",
    question: "Hur returnerar jag en vara?",
    answer: `Öppna ordern under Mitt konto eller via Spåra order och välj Returnera varor. Du får ett returnummer och instruktioner med e-post. Du har ${site.returnDays} dagars öppet köp.`,
  },
  {
    topic: "Retur",
    question: "När får jag pengarna tillbaka?",
    answer: "Vi återbetalar när returen har kommit fram, till samma betalsätt som du använde. Med kort och Klarna syns pengarna oftast inom 5–10 bankdagar. Frakten återbetalas när hela ordern returneras.",
  },
  {
    topic: "Retur",
    question: "Varan kom trasig. Vad gör jag?",
    answer: `Anmäl en retur med anledningen Skadad vid leverans, eller skriv till oss med en bild. Du har ${site.warrantyYears} års garanti och reklamationsrätt enligt konsumentköplagen.`,
  },
  {
    topic: "Betalning",
    question: "Hur fungerar presentkort?",
    answer: "Du skriver koden i varukorgen. Saldot dras när betalningen är klar och kan användas i flera köp. Presentkort gäller i två år.",
  },
  {
    topic: "Betalning",
    question: "Har ni rabattkoder?",
    answer: "Ibland. Koder skrivs in i kassan. Vi visar dem öppet, aldrig i en popup med nedräkning.",
  },
  {
    topic: "Konto",
    question: "Behöver jag ett konto för att handla?",
    answer: "Nej. Med ett konto ser du dina ordrar, sparar adressen till nästa köp och kan koppla tidigare beställningar till kontot.",
  },
  {
    topic: "Konto",
    question: "Hur tar jag bort mitt konto?",
    answer: "Under Mitt konto, Mina uppgifter kan du ladda ner dina uppgifter och ta bort kontot. Ordrar sparas avidentifierade i sju år enligt bokföringslagen.",
  },
];
