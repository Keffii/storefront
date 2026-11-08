import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { site } from "@/data/products";
import { GIFT_CARD_VALID_MONTHS } from "@/lib/gift-cards";

export const metadata: Metadata = {
  title: "Köpvillkor",
  description: "Villkoren som gäller när du handlar hos Objekt.",
  alternates: { canonical: "/kopvillkor" },
};

export default function TermsPage() {
  return (
    <LegalPage caption="Information" title="Köpvillkor" updated="8 november 2026">
      <section>
        <h2>Priser och betalning</h2>
        <p>
          Alla priser är i svenska kronor och inklusive 25 % moms. Du betalar med kort, Apple Pay, Google Pay eller Klarna
          via Stripe. Ordern är bindande när betalningen är godkänd och du har fått en orderbekräftelse med e-post.
        </p>
      </section>
      <section>
        <h2>Leverans</h2>
        <p>
          Vi levererar inom Sverige. Leveranssätt, pris och beräknad leveransdag visas i varukorgen innan du betalar. Mer om
          det under <Link href="/frakt-och-returer">Frakt och returer</Link>.
        </p>
      </section>
      <section>
        <h2>Ångerrätt och öppet köp</h2>
        <p>
          Enligt distansavtalslagen har du 14 dagars ångerrätt. Hos oss gäller {site.returnDays} dagars öppet köp från att du
          tagit emot varan. Varan ska vara oanvänd och helst ligga i originalförpackningen. Vi betalar tillbaka till samma
          betalsätt senast 14 dagar efter att returen kommit fram.
        </p>
      </section>
      <section>
        <h2>Reklamation och garanti</h2>
        <p>
          Du har tre års reklamationsrätt enligt konsumentköplagen för fel som fanns när du fick varan. Utöver det lämnar vi{" "}
          {site.warrantyYears} års garanti på material- och tillverkningsfel. Anmäl fel via{" "}
          <Link href="/kundservice#kontakt">kundservice</Link>, gärna med en bild.
        </p>
      </section>
      <section>
        <h2>Presentkort och rabattkoder</h2>
        <p>
          Presentkort gäller i {GIFT_CARD_VALID_MONTHS / 12} år från köpet och kan användas i flera köp tills saldot är slut. De
          kan inte lösas in mot kontanter. Rabattkoder kan inte kombineras med presentkort i samma köp.
        </p>
      </section>
      <section>
        <h2>Tvister</h2>
        <p>
          Hör av dig till oss först, så löser vi det. Annars kan du vända dig till Allmänna reklamationsnämnden (ARN) eller
          EU:s plattform för tvistlösning online.
        </p>
      </section>
    </LegalPage>
  );
}
