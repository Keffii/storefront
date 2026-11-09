import Link from "next/link";
import { CookieSettingsLink } from "@/components/consent/CookieBanner";
import { categories, site } from "@/data/products";
import { formatPrice } from "@/lib/format";
import { NewsletterForm } from "@/components/newsletter/NewsletterForm";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.brand}>
          <p className={styles.logo}>{site.brandName}</p>
          <p className={styles.tagline}>{site.tagline}</p>
          <NewsletterForm source="footer" tone="dark" />
        </div>

        <nav aria-label="Kategorier">
          <h2 className={`caption ${styles.heading}`}>Handla</h2>
          <ul role="list" className={styles.list}>
            <li>
              <Link href="/kollektion">Alla produkter</Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/kollektion/${c.id}`}>{c.name}</Link>
              </li>
            ))}
            <li>
              <Link href="/presentkort">Presentkort</Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Kundservice">
          <h2 className={`caption ${styles.heading}`}>Kundservice</h2>
          <ul role="list" className={styles.list}>
            <li>
              <Link href="/kundservice">Frågor och kontakt</Link>
            </li>
            <li>
              <Link href="/spara-order">Spåra order</Link>
            </li>
            <li>
              <Link href="/frakt-och-returer">Frakt och returer</Link>
            </li>
            <li className={styles.note}>
              Fri frakt över {formatPrice(site.freeShippingThreshold)} · {site.returnDays} dagars öppet köp
            </li>
          </ul>
        </nav>

        <nav aria-label="Information">
          <h2 className={`caption ${styles.heading}`}>Information</h2>
          <ul role="list" className={styles.list}>
            <li>
              <Link href="/om-projektet">Om projektet</Link>
            </li>
            <li>
              <Link href="/kopvillkor">Köpvillkor</Link>
            </li>
            <li>
              <Link href="/integritetspolicy">Integritetspolicy</Link>
            </li>
            <li>
              <Link href="/tillganglighet">Tillgänglighet</Link>
            </li>
          </ul>
          <p className={styles.about}>Varumärket och produkterna är påhittade och ingenting säljs på riktigt.</p>
        </nav>
      </div>

      <div className="container">
        <div className={styles.legal}>
        <span>
          © {new Date().getFullYear()} {site.brandName} · Portfolio demo
        </span>
        <span className={styles.legalLinks}>
          <CookieSettingsLink className={styles.linkButton} />
        </span>
        </div>
      </div>
    </footer>
  );
}
