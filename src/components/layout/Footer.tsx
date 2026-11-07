import Link from "next/link";
import { categories, site } from "@/data/products";
import { formatPrice } from "@/lib/format";
import styles from "./Footer.module.css";

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.grid}`}>
        <div className={styles.brand}>
          <p className={styles.logo}>{site.brandName}</p>
          <p className={styles.tagline}>{site.tagline}</p>
        </div>

        <nav aria-label="Kategorier">
          <h2 className={`caption ${styles.heading}`}>Handla</h2>
          <ul role="list" className={styles.list}>
            <li>
              <Link href="/kollektion">Alla produkter</Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link href={`/kollektion?kategori=${c.id}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className={`caption ${styles.heading}`}>Köpvillkor</h2>
          <ul role="list" className={styles.list}>
            <li>Fri frakt över {formatPrice(site.freeShippingThreshold)}</li>
            <li>{site.returnDays} dagars öppet köp</li>
            <li>{site.warrantyYears} års garanti</li>
            <li>Kort och Klarna</li>
          </ul>
        </div>

        <div>
          <h2 className={`caption ${styles.heading}`}>Om projektet</h2>
          <p className={styles.about}>
            En portfoliobutik byggd med Next.js, Stripe och AWS. Varumärket och produkterna är påhittade och
            ingenting säljs på riktigt.
          </p>
        </div>
      </div>

      <div className={`container ${styles.legal}`}>
        <span>
          © {new Date().getFullYear()} {site.brandName} · Portfolio demo
        </span>
        <Link href="/designsystem">Designsystem</Link>
      </div>
    </footer>
  );
}
