"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FloatingBuyCard } from "@/components/patterns/FloatingBuyCard";
import { track } from "@/lib/analytics";
import { useLiveProduct } from "@/components/inventory/InventoryProvider";
import { useBuyBoxArm } from "@/lib/experiment";
import type { Product } from "@/lib/types";
import { findVariantById } from "@/lib/variants";
import { BuyBox, type AddOnChoice } from "./BuyBox";
import { ProductGallery } from "./ProductGallery";
import styles from "./ProductView.module.css";

interface ProductViewProps {
  product: Product;
  addOns: AddOnChoice[];
  priceFrom: boolean;
  rating?: ReactNode;
}

/**
 * Owns the selected variant so the gallery and buy box stay in step, and
 * mirrors it in the URL (?variant=) so a shared link opens the same variant.
 * The page itself is static; the variant in the URL is applied on mount.
 */
export function ProductView({ product: initialProduct, addOns, priceFrom, rating }: ProductViewProps) {
  // Live stock from the layout; the page itself may be up to a minute old.
  const product = useLiveProduct(initialProduct);
  const arm = useBuyBoxArm();
  // Keep the id in state and look the variant up in the live product, so a
  // stock change reaches the buy box without a reload.
  const [variantId, setVariantId] = useState(product.defaultVariantId);
  const variant = findVariantById(product, variantId) ?? product.variants[0];

  const slug = product.slug;
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("variant");
    if (fromUrl && findVariantById(initialProduct, fromUrl)) setVariantId(fromUrl);
    track({ name: "product_view", product: slug });
  }, [slug, initialProduct]);

  const [preview, setPreview] = useState<typeof variant | null>(null);

  function changeVariant(next: typeof variant) {
    setPreview(null);
    setVariantId(next.id);
    const url = new URL(window.location.href);
    url.searchParams.set("variant", next.id);
    window.history.replaceState(window.history.state, "", url);
  }

  return (
    <div className={styles.layout}>
      <ProductGallery images={(preview ?? variant).images} productName={product.name} />
      <FloatingBuyCard label={`Köp ${product.name}`}>
        <BuyBox
          product={product}
          variant={variant}
          onVariantChange={changeVariant}
          onPreviewVariant={setPreview}
          addOns={addOns}
          priceFrom={priceFrom}
          rating={rating}
          arm={arm}
        />
      </FloatingBuyCard>
    </div>
  );
}
