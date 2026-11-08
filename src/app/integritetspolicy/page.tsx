import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import styles from "@/components/legal/LegalPage.module.css";

export const metadata: Metadata = {
  title: "Integritetspolicy",
  description: "Vilka uppgifter butiken sparar, var, hur länge och varför.",
  alternates: { canonical: "/integritetspolicy" },
};

/**
 * Every row here matches what the code does. When storage changes, change
 * this page in the same commit.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      caption="Information"
      title="Integritetspolicy"
      updated="8 november 2026"
      intro="Här står exakt vad butiken sparar, var det sparas, hur länge och varför. Vi säljer inga uppgifter och använder inga annonsnätverk."
    >
      <section>
        <h2>Vem som ansvarar</h2>
        <p>
          Personuppgiftsansvarig är den som driver demon Objekt. Frågor om dina uppgifter skickar du via{" "}
          <Link href="/kundservice#kontakt">kontaktformuläret</Link>.
        </p>
      </section>

      <section>
        <h2>I din webbläsare</h2>
        <p>Det här sparas bara på din enhet och skickas inte till oss förrän du handlar.</p>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th scope="col">Namn</th>
                <th scope="col">Vad</th>
                <th scope="col">Hur länge</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><code>objekt_consent</code> (cookie)</td>
                <td>Ditt val i cookierutan. Nödvändig, eftersom den kommer ihåg själva valet.</td>
                <td>180 dagar</td>
              </tr>
              <tr>
                <td><code>objekt_ab_buybox</code> (cookie)</td>
                <td>Vilken version av köpknappen du ser i ett A/B-test. Sätts bara om du godkänt statistik, och tas bort om du ändrar dig.</td>
                <td>90 dagar</td>
              </tr>
              <tr>
                <td>Cognito-cookies</td>
                <td>Håller dig inloggad om du har ett konto. Sätts först när du loggar in.</td>
                <td>Tills du loggar ut, högst 30 dagar</td>
              </tr>
              <tr>
                <td><code>objekt.cart.v1</code></td>
                <td>Varukorgen.</td>
                <td>Tills du tömmer den eller handlar</td>
              </tr>
              <tr>
                <td><code>objekt.delivery.v1</code></td>
                <td>Valt leveranssätt, ombud, postnummer och en eventuell presentkortskod.</td>
                <td>Tills du ändrar den</td>
              </tr>
              <tr>
                <td><code>objekt.favorites.v1</code></td>
                <td>Dina favoriter. Om du är inloggad sparas de även på kontot.</td>
                <td>Tills du tar bort dem</td>
              </tr>
              <tr>
                <td><code>objekt.purchase.…</code> (sessionStorage)</td>
                <td>Att ett köp redan räknats i statistiken, så att en omladdning inte räknar det två gånger.</td>
                <td>Tills fliken stängs</td>
              </tr>
              <tr>
                <td><code>objekt.recent.v1</code></td>
                <td>De senaste åtta produkterna du tittat på.</td>
                <td>Tills du rensar webbläsaren</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Hos oss</h2>
        <p>
          Allt sparas i en databas (Amazon DynamoDB) i AWS-regionen Stockholm (eu-north-1). Butiken körs på AWS Amplify i samma
          region.
        </p>
        <h3>När du handlar</h3>
        <p>
          Namn, e-post, leveransadress, varor, belopp och betalsätt sparas som en order. Ordrar behöver sparas i sju år enligt
          bokföringslagen. Kortnummer når aldrig oss; de hanteras av Stripe.
        </p>
        <h3>Om du skapar ett konto</h3>
        <p>
          E-post och lösenord hanteras av Amazon Cognito (vi ser aldrig lösenordet). Namn, adress, favoriter och ditt val om
          marknadsföring sparas på kontot. Du kan ladda ner allt och ta bort kontot under Mina uppgifter. När du tar bort kontot
          avidentifieras dina ordrar: namn, e-post och adress raderas, medan beloppen finns kvar för bokföringen.
        </p>
        <h3>Recensioner</h3>
        <p>Det namn du skriver, betyget och texten visas öppet på produktsidan.</p>
        <h3>Bevakningar, nyhetsbrev och presentkort</h3>
        <p>
          För en bevakning sparas e-posten tills varan är tillbaka, högst ett år (obekräftade tas bort efter sju dagar). För
          nyhetsbrevet sparas e-post, var du anmälde dig och när du bekräftade; obekräftade tas bort efter sju dagar och när du
          avslutar raderas adressen. För presentkort sparas köparens och mottagarens e-post tills tre månader efter att kortet gått ut.
        </p>
        <h3>Kontaktformuläret</h3>
        <p>Meddelandet sparas inte i databasen. Det skickas som e-post till kundservice och en kopia till dig.</p>
        <h3>Skydd mot missbruk</h3>
        <p>
          För att begränsa hur ofta formulär kan skickas sparas en saltad hash av din IP-adress, aldrig adressen själv. Den tas
          bort automatiskt efter högst några timmar.
        </p>
        <h3>Statistik</h3>
        <p>
          Bara om du godkänt statistik räknar vi sidvisningar och köp per dag, utan något som kan kopplas till dig. Räknarna
          sparas i 400 dagar. Ingen tredjepartsspårning laddas.
        </p>
      </section>

      <section>
        <h2>Vilka som hjälper oss</h2>
        <ul>
          <li>Amazon Web Services (drift, databas, inloggning, e-post via Amazon SES, bilder via Amazon S3 och CloudFront), region Stockholm.</li>
          <li>Stripe (kortbetalning och Klarna). Stripe är självständigt ansvarig för betaluppgifterna.</li>
        </ul>
      </section>

      <section>
        <h2>Dina rättigheter</h2>
        <p>
          Du har rätt att få veta vad vi sparar om dig, få det rättat eller raderat, invända mot behandling och få ut dina
          uppgifter. Med ett konto gör du det själv under Mina uppgifter. Annars skriver du till oss via{" "}
          <Link href="/kundservice#kontakt">kontaktformuläret</Link>. Du kan också klaga hos Integritetsskyddsmyndigheten (IMY).
        </p>
      </section>
    </LegalPage>
  );
}
