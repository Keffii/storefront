import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/server/auth";
import { isDbConfigured } from "@/lib/server/config";
import { getProfile } from "@/lib/server/customers";
import { AccountHeader } from "../AccountNav";
import { DeleteAccountForm, ProfileForm } from "./ProfileForms";
import styles from "../konto.module.css";

export const metadata: Metadata = { title: "Mina uppgifter", robots: { index: false } };
export const dynamic = "force-dynamic";

const date = new Intl.DateTimeFormat("sv-SE", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Stockholm" });

export default async function ProfilePage() {
  const session = await getSession();
  if (!session) redirect("/konto/logga-in?till=/konto/uppgifter");
  if (!isDbConfigured()) return <p className="container">Kontot är inte tillgängligt i den här miljön.</p>;
  const profile = await getProfile(session.sub);

  return (
    <div className={`container ${styles.page}`}>
      <AccountHeader email={session.email} current="uppgifter" />
      <h1 className={styles.h1}>Mina uppgifter</h1>

      <ProfileForm
        profile={profile}
        consentText={
          profile.marketingConsent.at
            ? `${profile.marketingConsent.granted ? "Godkänt" : "Avböjt"} ${date.format(new Date(profile.marketingConsent.at))}`
            : null
        }
      />

      <section className={styles.section} aria-labelledby="data-heading">
        <h2 id="data-heading" className={styles.h2}>
          Dina uppgifter hos oss
        </h2>
        <p className={styles.muted}>
          Vi sparar din e-post, det du fyller i ovan och dina ordrar. Ladda ner allt som en fil när du vill.
        </p>
        <p>
          <a href="/api/konto/export" download>
            Ladda ner mina uppgifter (JSON)
          </a>
        </p>
      </section>

      <section className={styles.section} aria-labelledby="delete-heading">
        <h2 id="delete-heading" className={styles.h2}>
          Radera konto
        </h2>
        <p className={styles.muted}>
          Kontot och dina sparade uppgifter raderas direkt. Ordrarna behåller vi för bokföringen, men utan namn, e-post och
          adress, och de kopplas bort från dig.
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}
