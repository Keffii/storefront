"use client";

import { itemFor, pushEcommerce } from "@/lib/datalayer";
import Image from "next/image";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { Price } from "@/components/ui/Price";
import { getDefaultVariant } from "@/data/products";
import { track } from "@/lib/analytics";
import type { Product } from "@/lib/types";
import { selectOption, soldOutValues, stockLevel } from "@/lib/variants";
import styles from "./QuickAdd.module.css";

/**
 * "Snabbköp" on a product card: pick colour and size in a small drawer and
 * add to the cart without leaving the collection. The button sits outside
 * the card's link, so the link still works and keyboard users reach both.
 * The cart prices the line as usual, so bundle discounts apply.
 */
export function QuickAdd({ product }: { product: Product }) {
  const { add } = useCart();
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState(() => getDefaultVariant(product));
  const level = stockLevel(variant);
  const options = product.options.filter((o) => o.values.length > 1);

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-label={`Snabbköp ${product.name}`}
        title="Snabbköp"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" />
        </svg>
      </button>

      <Drawer open={open} onClose={() => setOpen(false)} title="Snabbköp">
        <div className={styles.body}>
          <div className={styles.head}>
            <Image src={variant.images[0].src} alt="" width={96} height={96} sizes="96px" className={styles.thumb} />
            <div>
              <p className={styles.name}>{product.name}</p>
              <Price amount={variant.price} size="sm" />
            </div>
          </div>
          {options.map((o) => (
            <OptionPicker
              key={o.id}
              option={o}
              value={variant.options[o.id]}
              onChange={(id) => setVariant((v) => selectOption(product, v, o.id, id))}
              soldOut={soldOutValues(product, variant, o.id)}
            />
          ))}
          <p className={styles.stock}>
            {level === "sold-out" ? "Slutsåld i den här varianten" : level === "low" ? `I lager, ${variant.stock} kvar` : "I lager"}
          </p>
          <Button
            size="lg"
            fullWidth
            disabled={level === "sold-out"}
            onClick={() => {
              track({ name: "add_to_cart", product: product.slug, variant: variant.id, quantity: 1, value: variant.price });
              pushEcommerce("add_to_cart", { value: variant.price, items: [itemFor(product, variant)] });
              setOpen(false);
              add([{ slug: product.slug, variantId: variant.id, quantity: 1 }]);
            }}
          >
            {level === "sold-out" ? "Slutsåld" : "Lägg i varukorgen"}
          </Button>
          <a href={`/produkter/${product.slug}?variant=${variant.id}`} className={styles.details}>
            Se alla detaljer
          </a>
        </div>
      </Drawer>
    </>
  );
}
