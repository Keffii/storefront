"use client";

import { useEffect, useSyncExternalStore } from "react";
import { syncFavoritesWithAccount, useFavorites } from "@/components/favorites/useFavorites";
import { useCatalog } from "@/components/inventory/InventoryProvider";
import { ProductGrid } from "@/components/patterns/ProductGrid";
import { Button } from "@/components/ui/Button";
import styles from "./favoriter.module.css";

const subscribe = () => () => {};

export function FavoritesList() {
  const { slugs } = useFavorites();
  const catalog = useCatalog();
  const hydrated = useSyncExternalStore(subscribe, () => true, () => false);

  useEffect(() => {
    void syncFavoritesWithAccount();
  }, []);

  if (!hydrated) return null;
  const products = slugs.map((s) => catalog.find((p) => p.slug === s)).filter((p) => p !== undefined);

  if (products.length === 0) {
    return (
      <div className={styles.empty}>
        <p>Du har inga favoriter än. Tryck på hjärtat på en produkt för att spara den här.</p>
        <Button href="/kollektion" variant="secondary">
          Till butiken
        </Button>
      </div>
    );
  }
  return <ProductGrid products={products} />;
}
