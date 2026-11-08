"use client";

import { useEffect } from "react";
import { syncFavoritesWithAccount, useFavorites } from "./useFavorites";
import styles from "./FavoriteButton.module.css";

export function FavoriteButton({ slug, name, variant = "overlay" }: { slug: string; name: string; variant?: "overlay" | "inline" }) {
  const { has, toggle } = useFavorites();
  const active = has(slug);

  useEffect(() => {
    void syncFavoritesWithAccount();
  }, []);

  return (
    <button
      type="button"
      className={`${styles.button} ${styles[variant]}`}
      aria-pressed={active}
      aria-label={active ? `Ta bort ${name} från favoriter` : `Spara ${name} som favorit`}
      title={active ? "Sparad som favorit" : "Spara som favorit"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(slug);
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"
          fill={active ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
      {variant === "inline" && <span>{active ? "Sparad" : "Spara"}</span>}
    </button>
  );
}
