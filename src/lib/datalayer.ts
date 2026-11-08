/**
 * GA4 ecommerce events on window.dataLayer, for a tag manager the shop owner
 * may add later. Nothing is pushed before the visitor accepts statistics,
 * and no third-party script loads unless NEXT_PUBLIC_GTM_ID is set (see
 * TagManager). Google Consent Mode v2 defaults to denied.
 */
import { hasAnalyticsConsent } from "./consent";
import type { Money, Product, Variant } from "./types";
import { variantLabel } from "./variants";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export interface EcommerceItem {
  item_id: string;
  item_name: string;
  item_variant?: string;
  item_category?: string;
  item_brand?: string;
  price: number;
  quantity: number;
}

const kr = (ore: Money) => Math.round(ore) / 100;

export function itemFor(product: Product, variant: Variant, quantity = 1): EcommerceItem {
  return {
    item_id: variant.sku,
    item_name: product.name,
    item_variant: variantLabel(product, variant),
    item_category: product.category,
    item_brand: "Objekt",
    price: kr(variant.price),
    quantity,
  };
}

type EventName = "view_item" | "add_to_cart" | "begin_checkout" | "purchase";

/** Pushes one GA4 ecommerce event, clearing the previous ecommerce object first as GA4 recommends. */
export function pushEcommerce(event: EventName, data: { value: Money; items: EcommerceItem[]; transaction_id?: string; shipping?: Money }) {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return;
  window.dataLayer ??= [];
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({
    event,
    ecommerce: {
      currency: "SEK",
      value: kr(data.value),
      ...(data.transaction_id ? { transaction_id: data.transaction_id } : {}),
      ...(data.shipping !== undefined ? { shipping: kr(data.shipping) } : {}),
      items: data.items,
    },
  });
}
