"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FloatingBuyCard } from "@/components/patterns/FloatingBuyCard";
import { track } from "@/lib/analytics";
import type { Product } from "@/lib/types";
import { findVariantById } from "@/lib/variants";
import { BuyBox, type AddOnChoice, type BuyBoxArm } from "./BuyBox";
import { ProductGallery } from "./ProductGallery";
import styles from "./ProductView.module.css";

interface ProductViewProps {
  product: Product;
  addOns: AddOnChoice[];
  priceFrom: boolean;
  rating?: ReactNode;
  arm?: BuyBoxArm;
}

/**
 * Owns the selected variant so the gallery and buy box stay in step, and
 * mirrors it in the URL (?variant=) so a shared link opens the same variant.
 * The page itself is static; the variant in the URL is applied on mount.
 */
export function ProductView({ product, addOns, priceFrom, rating, arm }: ProductViewProps) {
  const [variant, setVariant] = useState(
    () => findVariantById(product, product.defaultVariantId) ?? product.variants[0],
  );

  useEffect(() => {
    const fromUrl = findVariantById(product, new URLSearchParams(window.location.search).get("variant"));
    if (fromUrl) setVariant(fromUrl);
    track({ name: "product_view", product: product.slug });
  }, [product]);

  function changeVariant(next: typeof variant) {
    setVariant(next);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next.id);
    window.history.replaceState(window.history.state, "", url);
  }

  return (
    <div className={styles.layout}>
      <ProductGallery images={variant.images} productName={product.name} />
      <FloatingBuyCard label={`Köp ${product.name}`}>
        <BuyBox
          product={product}
          variant={variant}
          onVariantChange={changeVariant}
          addOns={addOns}
          priceFrom={priceFrom}
          rating={rating}
          arm={arm}
        />
      </FloatingBuyCard>
    </div>
  );
}
