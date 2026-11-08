"use client";

import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { useCatalog } from "@/components/inventory/InventoryProvider";
import { Button } from "@/components/ui/Button";
import { setsFor } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import styles from "./SetOffers.module.css";

/** The default variant if it's in stock, else the first one that is. */
const pickVariant = (p: Product) =>
  [p.variants.find((v) => v.id === p.defaultVariantId), ...p.variants].find((v) => v && v.stock > 0);

/**
 * "Komplettera med": the sets this product is part of, at their set price.
 * The price is applied by the cart when one of each is in it, so adding the
 * pieces one by one gives the same result.
 */
export function SetOffers({ slug }: { slug: string }) {
  const catalog = useCatalog();
  const { add } = useCart();
  const offers = setsFor(slug, catalog);
  if (offers.length === 0) return null;

  return (
    <section className={styles.section} aria-labelledby="sets-title">
      <h2 id="sets-title" className={styles.title}>
        Komplettera med
      </h2>
      <div className={styles.list}>
        {offers.map(({ set, items, full, saving }) => {
          const variants = items.map(pickVariant);
          const available = variants.every(Boolean);
          return (
            <article key={set.id} className={styles.card}>
              <ul role="list" className={styles.items}>
                {items.map((p, i) => (
                  <li key={p.slug}>
                    <Link href={`/produkter/${p.slug}`} className={styles.item}>
                      <Image
                        src={(variants[i] ?? p.variants[0]).images[0].src}
                        alt=""
                        width={88}
                        height={88}
                        sizes="88px"
                        className={styles.thumb}
                      />
                      <span className={p.slug === slug ? styles.current : undefined}>{p.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className={styles.info}>
                <h3 className={styles.name}>{set.name}</h3>
                <p className={styles.description}>{set.description}</p>
                <p className={styles.price}>
                  <strong>{formatPrice(set.price)}</strong>{" "}
                  <span className={styles.full}>
                    Var för sig {formatPrice(full)}, du sparar {formatPrice(saving)}
                  </span>
                </p>
                <Button
                  variant="secondary"
                  disabled={!available}
                  onClick={() => add(variants.map((v, i) => ({ slug: items[i].slug, variantId: v!.id, quantity: 1 })))}
                >
                  {available ? "Lägg setet i varukorgen" : "En del är slutsåld"}
                </Button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
