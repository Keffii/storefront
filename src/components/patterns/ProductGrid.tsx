import type { RatingSummary } from "@/lib/reviews";
import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import styles from "./ProductGrid.module.css";

export function ProductGrid({
  products,
  priorityCount = 0,
  ratings,
}: {
  products: Product[];
  priorityCount?: number;
  ratings?: Record<string, RatingSummary>;
}) {
  return (
    <ul role="list" className={styles.grid}>
      {products.map((p, i) => (
        <li key={p.slug}>
          <ProductCard product={p} priority={i < priorityCount} rating={ratings?.[p.slug]} />
        </li>
      ))}
    </ul>
  );
}
