"use client";

import { createContext, useContext, type ReactNode } from "react";
import { products as seed } from "@/data/products";
import type { Product } from "@/lib/types";

const CatalogContext = createContext<Product[]>(seed);

/**
 * Gives client components the published catalogue with live stock, as the
 * server read it (products from DynamoDB once the admin has edited them).
 */
export function InventoryProvider({ products, children }: { products: Product[]; children: ReactNode }) {
  return <CatalogContext.Provider value={products}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): Product[] {
  return useContext(CatalogContext);
}

export function useLiveProduct(product: Product): Product {
  const products = useCatalog();
  return products.find((p) => p.slug === product.slug) ?? product;
}
