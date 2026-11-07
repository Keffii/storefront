import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Price } from "@/components/ui/Price";
import { getDefaultVariant, getPriceRange } from "@/data/products";
import type { Product } from "@/lib/types";
import styles from "./ProductCard.module.css";

export function ProductCard({ product, priority }: { product: Product; priority?: boolean }) {
  const variant = getDefaultVariant(product);
  const { min, max } = getPriceRange(product);
  const [front, alt] = variant.images;
  const colors = product.options.find((o) => o.id === "color")?.values ?? [];
  const inStock = product.variants.some((v) => v.stock > 0);

  return (
    <article className={styles.card}>
      <Link href={`/produkter/${product.slug}`} className={styles.link}>
        <div className={styles.media}>
          <Image
            src={front.src}
            alt={front.alt}
            width={front.width}
            height={front.height}
            sizes="(min-width: 1080px) 25vw, (min-width: 720px) 33vw, 50vw"
            priority={priority}
            className={styles.image}
          />
          {alt && (
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
        </div>
      </Link>
      <div className={styles.meta}>
        {colors.length > 1 && (
          <ul role="list" className={styles.dots} aria-label={`Finns i ${colors.length} färger`}>
            {colors.map((c) => (
              <li key={c.id} className={styles.dot} style={{ background: c.swatch }} title={c.label} />
            ))}
          </ul>
        )}
        {!inStock && <span className={styles.stock}>Slutsåld</span>}
      </div>
    </article>
  );
}
