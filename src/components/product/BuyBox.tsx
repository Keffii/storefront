"use client";

import { itemFor, pushEcommerce } from "@/lib/datalayer";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { FavoriteButton } from "@/components/favorites/FavoriteButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { Price } from "@/components/ui/Price";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { site } from "@/data/products";
import { track } from "@/lib/analytics";
import { MAX_QUANTITY } from "@/lib/cart";
import { formatPrice } from "@/lib/format";
import type { Money, Product, Variant } from "@/lib/types";
import { selectOption, soldOutValues, stockLevel, variantLabel } from "@/lib/variants";
import { BackInStockForm } from "./BackInStockForm";
import { DeliveryEstimate } from "./DeliveryEstimate";
import { StickyBuyBar } from "./StickyBuyBar";
import { KlarnaMessage } from "./KlarnaMessage";
import { SizeGuide } from "./SizeGuide";
import styles from "./BuyBox.module.css";

export interface AddOnChoice {
  product: Product;
  variant: Variant;
  discount: Money;
}

export type BuyBoxArm = "A" | "B";

interface BuyBoxProps {
  product: Product;
  variant: Variant;
  onVariantChange: (v: Variant) => void;
  /** Hovering a colour previews it in the gallery without selecting it. */
  onPreviewVariant?: (v: Variant | null) => void;
  addOns: AddOnChoice[];
  priceFrom: boolean;
  rating?: ReactNode;
  /** A/B test arm. B shows the total price on the buy button. */
  arm?: BuyBoxArm;
}

export function BuyBox({
  product,
  variant,
  onVariantChange,
  onPreviewVariant,
  addOns,
  priceFrom,
  rating,
  arm = "A",
}: BuyBoxProps) {
  const { add } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [chosenAddOns, setChosenAddOns] = useState<Set<string>>(new Set());
  const buttonRef = useRef<HTMLButtonElement>(null);

  const level = stockLevel(variant);
  const soldOut = level === "sold-out";
  const maxQuantity = Math.max(1, Math.min(MAX_QUANTITY, variant.stock));

  // Keep the quantity valid when switching to a variant with less stock.
  useEffect(() => {
    setQuantity((q) => Math.min(q, maxQuantity));
  }, [maxQuantity]);

  function pick(optionId: (typeof product.options)[number]["id"], valueId: string) {
    const next = selectOption(product, variant, optionId, valueId);
    if (next.id !== variant.id) {
      onVariantChange(next);
      track({ name: "variant_picked", product: product.slug, variant: next.id });
    }
  }

  function toggleAddOn(slug: string) {
    setChosenAddOns((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  function addToCart() {
    if (soldOut) return;
    const extras = addOns.filter((a) => chosenAddOns.has(a.product.slug));
    add([
      { slug: product.slug, variantId: variant.id, quantity },
      ...extras.map((a) => ({ slug: a.product.slug, variantId: a.variant.id, quantity })),
    ]);
    track({
      name: "add_to_cart",
      product: product.slug,
      variant: variant.id,
      quantity,
      value: variant.price * quantity,
    });
    pushEcommerce("add_to_cart", {
      value: variant.price * quantity + extras.reduce((s, a) => s + (a.variant.price - a.discount) * quantity, 0),
      items: [itemFor(product, variant, quantity), ...extras.map((a) => itemFor(a.product, a.variant, quantity))],
    });
    setChosenAddOns(new Set());
  }

  const lineTotal =
    variant.price * quantity +
    addOns.filter((a) => chosenAddOns.has(a.product.slug)).reduce((s, a) => s + (a.variant.price - a.discount) * quantity, 0);

  const buttonLabel = soldOut
    ? "Slutsåld"
    : arm === "B"
      ? `Lägg i varukorgen · ${formatPrice(lineTotal)}`
      : "Lägg i varukorgen";

  const delivery = <DeliveryEstimate soldOut={soldOut} />;

  return (
    <div className={styles.box}>
      {product.badges.length > 0 && (
        <div className={styles.badges}>
          {product.badges.map((b) => (
            <Badge key={b} kind={b} />
          ))}
        </div>
      )}

      <div className={styles.titleBlock}>
        <div className={styles.titleRow}>
          <h1 className={styles.name}>{product.name}</h1>
          <FavoriteButton slug={product.slug} name={product.name} variant="inline" />
        </div>
        <p className={styles.tagline}>{product.tagline}</p>
        {rating}
      </div>

      <div className={styles.price}>
        <Price amount={variant.price} size="lg" />
        {priceFrom && <span className={styles.priceNote}>Priset gäller vald storlek</span>}
      </div>
      <KlarnaMessage amount={variant.price} />

      {product.options
        .filter((o) => o.values.length > 1)
        .map((o) => (
          <OptionPicker
            key={o.id}
            option={o}
            value={variant.options[o.id]}
            onChange={(id) => pick(o.id, id)}
            soldOut={soldOutValues(product, variant, o.id)}
            onPreview={
              o.id === "color" && onPreviewVariant
                ? (id) => onPreviewVariant(id ? selectOption(product, variant, "color", id) : null)
                : undefined
            }
          />
        ))}

      <SizeGuide product={product} />

      <p className={`${styles.stock} ${styles[level]}`} aria-live="polite">
        <span className={styles.stockDot} aria-hidden="true" />
        {level === "in-stock" && "I lager"}
        {level === "low" && `I lager, ${variant.stock} kvar`}
        {level === "sold-out" && "Slutsåld i den här varianten. Välj en annan eller bevaka den nedan."}
      </p>

      <div className={styles.actions}>
        {!soldOut && (
          <QuantityStepper value={quantity} onChange={setQuantity} max={maxQuantity} label="Antal" />
        )}
        <Button ref={buttonRef} size="lg" fullWidth onClick={addToCart} disabled={soldOut} className={styles.addButton}>
          {buttonLabel}
        </Button>
      </div>

      {soldOut && <BackInStockForm slug={product.slug} variantId={variant.id} label={variantLabel(product, variant)} />}

      {addOns.length > 0 && !soldOut && (
        <fieldset className={styles.addOns}>
          <legend className="caption">Köp till och spara</legend>
          {addOns.map((a) => {
            const checked = chosenAddOns.has(a.product.slug);
            return (
              <label key={a.product.slug} className={`${styles.addOn} ${checked ? styles.addOnChecked : ""}`}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={checked}
                  onChange={() => toggleAddOn(a.product.slug)}
                />
                <span className={styles.addOnImage}>
                  <Image src={a.variant.images[0].src} alt="" width={56} height={56} sizes="56px" />
                </span>
                <span className={styles.addOnText}>
                  <span>{a.product.name}</span>
                  <span className={styles.addOnSub}>{a.product.tagline}</span>
                </span>
                <span className={styles.addOnPrice}>
                  <Price amount={a.variant.price - a.discount} before={a.variant.price} size="sm" />
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      {delivery}

      <ul role="list" className={styles.trust}>
        <li>
          <TrustIcon path="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
          Fri frakt över {formatPrice(site.freeShippingThreshold)}
        </li>
        <li>
          <TrustIcon path="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" />
          {site.returnDays} dagars öppet köp
        </li>
        <li>
          <TrustIcon path="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z" />
          {site.warrantyYears} års garanti
        </li>
        <li>
          <TrustIcon path="M3 6h18v12H3zM3 10h18" />
          Kort eller Klarna
        </li>
      </ul>

      <StickyBuyBar
        target={buttonRef}
        image={variant.images[0]}
        title={variantLabel(product, variant)}
        price={variant.price}
        soldOut={soldOut}
        onAdd={addToCart}
      />
    </div>
  );
}

function TrustIcon({ path }: { path: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d={path} stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
