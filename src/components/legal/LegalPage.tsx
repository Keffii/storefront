import type { ReactNode } from "react";
import styles from "./LegalPage.module.css";

/** Shared layout for terms, privacy, shipping and accessibility pages. */
export function LegalPage({
  caption,
  title,
  updated,
  intro,
  children,
}: {
  caption: string;
  title: string;
  updated: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <article className={`container ${styles.page}`}>
      <header className={styles.header}>
        <p className="caption">{caption}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.updated}>Senast uppdaterad {updated}</p>
        {intro && <div className={styles.intro}>{intro}</div>}
        <p className={styles.demo}>
          Objekt är en portfoliodemo. Villkoren är skrivna som för en riktig butik, men ingenting säljs och inga pengar dras.
        </p>
      </header>
      <div className={styles.body}>{children}</div>
    </article>
  );
}
