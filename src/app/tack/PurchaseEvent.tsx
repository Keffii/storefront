"use client";

import { useEffect } from "react";
import { pushEcommerce, type EcommerceItem } from "@/lib/datalayer";

/** GA4 "purchase", once per order even if the page is reloaded. */
export function PurchaseEvent({ id, value, shipping, items }: { id: string; value: number; shipping: number; items: EcommerceItem[] }) {
  useEffect(() => {
    const key = `objekt.purchase.${id}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      // Without sessionStorage a reload may report the purchase twice; GA de-duplicates on transaction_id.
    }
    pushEcommerce("purchase", { transaction_id: id, value, shipping, items });
  }, [id, value, shipping, items]);
  return null;
}
