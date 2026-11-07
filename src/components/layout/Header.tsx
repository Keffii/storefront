import Link from "next/link";
import { categories, site } from "@/data/products";
import { MobileMenu } from "./MobileMenu";
import styles from "./Header.module.css";

export const navLinks = [
  { href: "/kollektion", label: "Alla produkter" },
  ...categories.map((c) => ({ href: `/kollektion?kategori=${c.id}`, label: c.name })),
];

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <MobileMenu links={navLinks} />

        <Link href="/" className={styles.logo} aria-label={`${site.brandName} – startsida`}>
          {site.brandName}
        </Link>

        <nav aria-label="Huvudmeny" className={styles.nav}>
          <ul role="list" className={styles.navList}>
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={styles.navLink}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.actions}>
          {/* The cart drawer arrives in phase 3; the button reserves its place. */}
          <button type="button" className={styles.iconButton} aria-label="Varukorg, 0 varor" disabled>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 8h14l-1.2 12H6.2L5 8Z" stroke="currentColor" strokeWidth="1.4" />
              <path d="M9 8V6.5a3 3 0 0 1 6 0V8" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <span className={styles.count} aria-hidden="true">
              0
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
