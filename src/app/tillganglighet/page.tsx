import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Tillgänglighetsredogörelse",
  description: "Hur tillgänglig webbutiken är, hur vi testar och vilka brister vi känner till.",
  alternates: { canonical: "/tillganglighet" },
};

/** Based on the automated axe checks in tests/e2e and manual keyboard and screen reader testing. */
export default function AccessibilityPage() {
  return (
    <LegalPage
      caption="Information"
      title="Tillgänglighetsredogörelse"
      updated="8 november 2026"
      intro="Butiken ska gå att använda för alla, med tangentbord, skärmläsare, förstoring och på mobilen. Målet är WCAG 2.2 nivå AA."
    >
      <section>
        <h2>Hur vi testar</h2>
        <ul>
          <li>
            Automatiska tester med axe körs vid varje ändring på startsidan, kollektionen, en produktsida, om-sidan, kundservice,
            integritetspolicyn, frakt och returer, presentkort, sökresultat, sökrutan och varukorgen, på dator och mobil. Inga allvarliga eller kritiska fel tillåts.
          </li>
          <li>Ett test går hela köpet med bara tangentbordet: välja variant, lägga i varukorgen och gå till kassan.</li>
          <li>Lighthouse mäter tillgänglighet på de viktigaste sidorna; senaste mätningen gav 100 av 100.</li>
          <li>Manuell kontroll med tangentbord när nya delar byggs. Ett genomgående test med skärmläsare (NVDA och VoiceOver) är inte gjort än.</li>
        </ul>
      </section>
      <section>
        <h2>Det här fungerar</h2>
        <ul>
          <li>Allt går att nå och använda med tangentbord, med synlig fokusmarkering.</li>
          <li>Varukorg, sök, snabbköp och menyer är riktiga dialoger som fångar fokus och stängs med Escape.</li>
          <li>Färgval är radioknappar med namn, så skärmläsare säger vilken färg som är vald och om den är slutsåld.</li>
          <li>Texter har tillräcklig kontrast (kontrolleras av axe) och layouten anpassar sig till smala skärmar, ner till mobilbredd.</li>
          <li>Rörelse är dämpad för den som valt minskad rörelse i sitt system.</li>
        </ul>
      </section>
      <section>
        <h2>Kända brister</h2>
        <ul>
          <li>Produktbilderna är genererade illustrationer. Alternativtexterna beskriver färg och vinkel men inte detaljer som en riktig produktbild skulle visa.</li>
          <li>Stripes kassa och Klarnas flöde är tredjepartstjänster som vi inte kan ändra. Stripe arbetar enligt WCAG men vi har inte testat kassan själva.</li>
          <li>Kartor över ombud finns inte; ombuden visas bara som en lista med adresser.</li>
          <li>Inget fullständigt skärmläsartest är gjort, se ovan.</li>
        </ul>
      </section>
      <section>
        <h2>Hittar du ett problem?</h2>
        <p>
          Berätta via <Link href="/kundservice#kontakt">kontaktformuläret</Link>, så åtgärdar vi det. Får du inget svar kan du
          anmäla till Myndigheten för digital förvaltning (Digg).
        </p>
      </section>
    </LegalPage>
  );
}
