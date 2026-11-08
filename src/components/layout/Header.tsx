import Link from "next/link";
import { categories, site } from "@/data/products";
import { AccountLink } from "@/components/account/AccountLink";
import { CartButton } from "@/components/cart/CartButton";
import { MobileMenu } from "./MobileMenu";
import styles from "./Header.module.css";

export const navLinks = [
  { href: "/kollektion", label: "Alla produkter" },
  ...categories.map((c) => ({ href: `/kollektion/${c.id}`, label: c.name })),
];

export function Header() {
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <MobileMenu links={navLinks} />

        <Link href="/" className={styles.logo} aria-label={`${site.brandName}, startsida`}>
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
          <AccountLink />
          <CartButton />
        </div>
      </div>
    </header>
  );
}
