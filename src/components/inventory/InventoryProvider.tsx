"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { products as catalog } from "@/data/products";
import { withStock, type StockMap } from "@/lib/inventory";
import type { Product } from "@/lib/types";

const CatalogContext = createContext<Product[]>(catalog);

/** Gives client components the catalogue with live stock from the server. */
export function InventoryProvider({ stock, children }: { stock: StockMap; children: ReactNode }) {
  const products = useMemo(() => withStock(catalog, stock), [stock]);
  return <CatalogContext.Provider value={products}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): Product[] {
  return useContext(CatalogContext);
}

export function useLiveProduct(product: Product): Product {
  const products = useCatalog();
  return products.find((p) => p.slug === product.slug) ?? product;
}
