import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { site } from "@/data/products";
import { formatPrice } from "@/lib/format";
import styles from "./om.module.css";

export const metadata: Metadata = {
  title: "Om projektet",
  description: "Hur portfoliobutiken Objekt är byggd, och varför butiken har de funktioner den har.",
  alternates: { canonical: "/om-projektet" },
};

// Only shown when a public repository URL is configured (the repo is private by default).
const REPO_URL = process.env.NEXT_PUBLIC_REPO_URL;

export default function AboutProjectPage() {
  return (
    <article className={`container ${styles.page}`}>
      <header className={styles.header}>
        <p className="caption">Om projektet</p>
        <h1 className={styles.title}>En webbutik byggd för att visa hur jag arbetar</h1>
        <p className={styles.lead}>
          Objekt är en påhittad butik. Varumärket och produkterna finns inte, bilderna är genererade och alla
          betalningar går mot Stripes testläge. Allt annat fungerar som i en riktig butik: varukorgen, kassan,
          orderhanteringen och recensionerna.
        </p>
      </header>

      <section className={styles.section} aria-labelledby="flode">
        <h2 id="flode" className={styles.h2}>
          Testa ett köp
        </h2>
        <ol className={styles.steps}>
          <li>Välj en produkt, en färg och eventuellt ett tillbehör till paketpris.</li>
          <li>
            Gå till kassan och betala med Stripes testkort <code>4242 4242 4242 4242</code>, valfritt framtida datum
            och valfri CVC. Klarna går också att välja i testläge.
          </li>
          <li>
            Stripe skickar en webhook till butiken. Servern kontrollerar signaturen och sparar ordern i DynamoDB.
          </li>
          <li>Ordern syns i adminvyn, där den kan markeras som skickad.</li>
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="val">
        <h2 id="val" className={styles.h2}>
          Funktionerna, och varför de finns
        </h2>
        <dl className={styles.choices}>
          <div>
            <dt>Leveransdatum vid köpknappen</dt>
            <dd>
              Datumet räknas från klockan i Stockholm, med brytpunkt kl. {site.shippingCutoffHour}, helger och svenska
              röda dagar. Kunden ser när varan kommer utan att behöva leta i fraktvillkoren.
            </dd>
          </div>
          <div>
            <dt>En köpknapp som följer med</dt>
            <dd>
              När den stora knappen har scrollats bort dyker en smal list upp längst ner med produkten, priset och
              en knapp. Den som läst klart specifikationerna kan köpa direkt.
            </dd>
          </div>
          <div>
            <dt>Mätare för fri frakt</dt>
            <dd>
              Varukorgen visar hur mycket som saknas till fri frakt ({formatPrice(site.freeShippingThreshold)}). Det
              är ett av de vanligaste sätten att höja ordervärdet, och kunden vet alltid vad frakten kostar.
            </dd>
          </div>
          <div>
            <dt>Tillbehör till paketpris</dt>
            <dd>
              Bordslampan säljs med en glödlampa och vaserna med en skötselduk till lägre pris. Rabatten räknas om på
              servern vid varje köp, så den går inte att manipulera från webbläsaren.
            </dd>
          </div>
          <div>
            <dt>Färgval direkt på produktkorten</dt>
            <dd>
              Håll muspekaren över en färgprick för att se produkten i den färgen. Ett klick tar dig direkt till den
              varianten på produktsidan.
            </dd>
          </div>
          <div>
            <dt>Kategorier som egna sidor, filter i adressen</dt>
            <dd>
              Varje kategori är en egen sida som byggs i förväg och cachas nära besökaren, så den laddar snabbt och
              syns i sökmotorer. Färg, pris och sortering läggs i adressen, så varje filtrerad vy har en länk som går att
              dela och bakåtknappen tar bort det senaste filtret.
            </dd>
          </div>
          <div>
            <dt>Ett A/B-test på köpknappen</dt>
            <dd>
              Hälften av besökarna som godkänt statistik ser totalpriset på knappen. Adminvyn visar andelen som lägger
              i varukorgen och antalet köp för varje variant.
            </dd>
          </div>
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="bortvalt">
        <h2 id="bortvalt" className={styles.h2}>
          Det jag valde bort
        </h2>
        <p className={styles.text}>
          Butiken har inga nedräkningar, inga påhittade &quot;tidigare priser&quot; och ingen popup med lyckohjul.
          Ingen video startar av sig själv. Lagersaldot som visas är det som står i produktdatan. Recensionerna
          skrivs av besökare och ingen recension är förifylld. Statistik räknas först när besökaren har godkänt det,
          och båda knapparna i cookiebannern är lika stora.
        </p>
        <p className={styles.text}>
          Sådana knep kan ge fler köp på kort sikt. För en butik som vill att kunderna kommer tillbaka kostar de
          förtroende, och de gör det svårare att lita på siffrorna i ett A/B-test.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="teknik">
        <h2 id="teknik" className={styles.h2}>
          Teknik
        </h2>
        <ul className={styles.tech}>
          <li>Next.js 15 och TypeScript, med sidor som renderas på servern och uppdateras när en recension kommer in</li>
          <li>AWS Amplify för hosting och Cognito för inloggningen till adminvyn</li>
          <li>En DynamoDB-tabell för ordrar, recensioner, statistik och begränsning av antal anrop</li>
          <li>Stripe Checkout med kort och Klarna i svenska kronor, och en webhook som sparar ordern</li>
          <li>Vitest för logiken (priser, leveransdatum, filter) och Playwright för hela köpflödet</li>
          <li>Produktdata i en enda fil, så ett nytt sortiment kräver inga kodändringar</li>
        </ul>
      </section>

      <div className={styles.actions}>
        {REPO_URL && (
          <Button href={REPO_URL} variant="secondary">
            Källkoden på GitHub
          </Button>
        )}
        <Button href="/kollektion">Till butiken</Button>
      </div>

      <p className={styles.small}>
        Designsystemet med färger, typsnitt och komponenter finns på <Link href="/designsystem">en egen sida</Link>.
      </p>
    </article>
  );
}
