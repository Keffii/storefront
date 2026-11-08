"use client";

import { useEffect, useState } from "react";
import { useCatalog } from "@/components/inventory/InventoryProvider";
import { ProductGrid } from "@/components/patterns/ProductGrid";
import styles from "./RecentlyViewed.module.css";

const KEY = "objekt.recent.v1";
const MAX = 8;

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

/**
 * "Senast visade": products this browser looked at, newest first, kept in
 * localStorage only. Pass `current` on a product page to record the visit
 * and leave that product out of the row. Renders nothing until there's
 * something to show; it sits at the bottom of the page, so appearing after
 * load doesn't move anything the visitor is looking at.
 */
export function RecentlyViewed({ current }: { current?: string }) {
  const catalog = useCatalog();
  const [slugs, setSlugs] = useState<string[]>([]);

  useEffect(() => {
    const previous = read();
    if (current) {
      try {
        window.localStorage.setItem(KEY, JSON.stringify([current, ...previous.filter((s) => s !== current)].slice(0, MAX)));
      } catch {
        // Storage unavailable: the row just stays empty.
      }
    }
    setSlugs(previous.filter((s) => s !== current));
  }, [current]);

  const products = slugs.map((s) => catalog.find((p) => p.slug === s)).filter((p) => p !== undefined).slice(0, 4);
  if (products.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="recent-title">
      <h2 id="recent-title" className={styles.title}>
        Senast visade
      </h2>
      <ProductGrid products={products} />
    </section>
  );
}
