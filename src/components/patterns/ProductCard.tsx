"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { RatingLine } from "@/components/reviews/RatingLine";
import { Badge } from "@/components/ui/Badge";
import { Price } from "@/components/ui/Price";
import { getDefaultVariant, getPriceRange } from "@/data/products";
import type { RatingSummary } from "@/lib/reviews";
import type { Product, Variant } from "@/lib/types";
import styles from "./ProductCard.module.css";

/** The variant to show for a colour: the default one if it matches, else an in-stock one. */
function variantForColor(product: Product, colorId: string): Variant | undefined {
  const def = getDefaultVariant(product);
  if (def.options.color === colorId) return def;
  const matching = product.variants.filter((v) => v.options.color === colorId);
  return matching.find((v) => v.stock > 0) ?? matching[0];
}

/**
 * Product card. Hovering or focusing a colour dot previews that colour;
 * clicking (or tapping, on touch screens) keeps it, and the card then links
 * straight to that variant.
 */
export function ProductCard({
  product,
  priority,
  rating,
}: {
  product: Product;
  priority?: boolean;
  rating?: RatingSummary;
}) {
  const defaultVariant = getDefaultVariant(product);
  const { min, max } = getPriceRange(product);
  const colors = product.options.find((o) => o.id === "color")?.values ?? [];
  const inStock = product.variants.some((v) => v.stock > 0);

  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const activeColor = hovered ?? selected;
  const variant = (activeColor && variantForColor(product, activeColor)) || defaultVariant;
  const linkVariant = selected ? variantForColor(product, selected) : undefined;
  const href = `/produkter/${product.slug}${linkVariant ? `?variant=${linkVariant.id}` : ""}`;
  const [front, alt] = variant.images;
  const showAltOnHover = !activeColor && alt;

  return (
    <article className={styles.card}>
      {/* Outside the link: a button can't sit inside an <a>. */}
      <FavoriteButton slug={product.slug} name={product.name} />
      <Link href={href} className={styles.link}>
        <div className={styles.media}>
          <Image
            key={front.src}
            src={front.src}
            alt={front.alt}
            width={front.width}
            height={front.height}
            sizes="(min-width: 1080px) 25vw, (min-width: 720px) 33vw, 50vw"
            priority={priority}
            fetchPriority={priority ? "high" : undefined}
            className={styles.image}
          />
          {showAltOnHover && (
            <Image
              src={alt.src}
              alt=""
              width={alt.width}
              height={alt.height}
              sizes="(min-width: 1080px) 25vw, (min-width: 720px) 33vw, 50vw"
              className={`${styles.image} ${styles.hover}`}
            />
          )}
          {product.badges.length > 0 && (
            <div className={styles.badges}>
              {product.badges.map((b) => (
                <Badge key={b} kind={b} />
              ))}
            </div>
          )}
        </div>
        <div className={styles.body}>
          <h3 className={styles.name}>{product.name}</h3>
          <Price amount={min} from={min !== max} size="sm" />
          {rating && <RatingLine summary={rating} size="sm" />}
        </div>
      </Link>
      <div className={styles.meta}>
        {colors.length > 1 && (
          <ul
            role="list"
            className={styles.swatches}
            aria-label={`Färger för ${product.name}`}
            onMouseLeave={() => setHovered(null)}
          >
            {colors.map((c) => {
              const soldOut = !product.variants.some((v) => v.options.color === c.id && v.stock > 0);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    className={styles.swatch}
                    aria-label={`Visa ${product.name} i ${c.label}${soldOut ? " (slutsåld)" : ""}`}
                    aria-pressed={selected === c.id}
                    title={c.label}
                    onMouseEnter={() => setHovered(c.id)}
                    onFocus={() => setHovered(c.id)}
                    onBlur={() => setHovered(null)}
                    onClick={() => setSelected((s) => (s === c.id ? null : c.id))}
                  >
                    <span
                      className={`${styles.dot} ${soldOut ? styles.dotSoldOut : ""}`}
                      style={{ background: c.swatch }}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {!inStock && <span className={styles.stock}>Slutsåld</span>}
      </div>
    </article>
  );
}
