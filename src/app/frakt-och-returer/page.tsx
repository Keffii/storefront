import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/LegalPage";
import { site } from "@/data/products";
import { formatPrice } from "@/lib/format";
import { SHIPPING_METHODS } from "@/lib/shipping";

export const metadata: Metadata = {
  title: "Frakt och returer",
  description: "Leveranssätt, priser, leveranstider och hur du returnerar en vara.",
  alternates: { canonical: "/frakt-och-returer" },
};

const days = (min: number, max: number) => (min === max ? `${min} vardag` : `${min}–${max} vardagar`);

export default function ShippingPage() {
  return (
    <LegalPage caption="Kundservice" title="Frakt och returer" updated="8 november 2026">
      <section>
        <h2>Leveranssätt</h2>
        <table>
          <thead>
            <tr>
              <th scope="col">Sätt</th>
              <th scope="col">Pris</th>
              <th scope="col">Leveranstid</th>
            </tr>
          </thead>
          <tbody>
            {SHIPPING_METHODS.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.label}
                  <br />
                  <small>{m.description}</small>
                </td>
                <td>
                  {formatPrice(m.fee)}
                  {m.freeOverThreshold && (
                    <>
                      <br />
                      <small>Fri från {formatPrice(site.freeShippingThreshold)}</small>
                    </>
                  )}
                </td>
                <td>
                  {days(m.minDays, m.maxDays)}
                  <br />
                  <small>Order före kl. {m.cutoffHour} skickas samma vardag</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Du väljer leveranssätt och ombud i varukorgen. Helger och svenska helgdagar räknas inte som vardagar. När ordern skickas
          får du ett mejl med en länk för att följa paketet.
        </p>
      </section>
      <section>
        <h2>Returer</h2>
        <p>
          Du har {site.returnDays} dagars öppet köp. Anmäl returen under Mitt konto eller via{" "}
          <Link href="/spara-order">Spåra order</Link>: välj varor och anledning, så får du ett returnummer och instruktioner med
          e-post. Returfrakten är gratis.
        </p>
        <p>
          Vi återbetalar det du betalade för varorna till samma betalsätt när paketet har kommit fram. Frakten betalas tillbaka
          när hela ordern returneras. Med kort och Klarna syns pengarna oftast inom 5–10 bankdagar.
        </p>
      </section>
      <section>
        <h2>Trasig eller fel vara</h2>
        <p>
          Anmäl en retur med anledningen Skadad vid leverans eller Fel vara, eller <Link href="/kundservice#kontakt">skriv till oss</Link>{" "}
          med en bild. Vi står för alla kostnader.
        </p>
      </section>
    </LegalPage>
  );
}
