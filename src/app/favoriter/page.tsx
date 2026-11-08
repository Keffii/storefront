import type { Metadata } from "next";
import { FavoritesList } from "./FavoritesList";
import styles from "./favoriter.module.css";

export const metadata: Metadata = { title: "Favoriter", robots: { index: false } };

export default function FavoritesPage() {
  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.header}>
        <p className="caption">Sparat</p>
        <h1 className={styles.title}>Favoriter</h1>
        <p className={styles.lead}>Favoriterna sparas i webbläsaren. Är du inloggad följer de med till dina andra enheter.</p>
      </header>
      <FavoritesList />
    </div>
  );
}
