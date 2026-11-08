"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useCatalog } from "@/components/inventory/InventoryProvider";
import { priceCart, type PricedCart } from "@/lib/cart";
import { cartStore } from "./cartStore";

interface CartContextValue {
  cart: PricedCart;
  /** False until the browser has read the saved cart (avoids flashing "empty"). */
  ready: boolean;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (items: { slug: string; variantId: string; quantity: number }[]) => void;
  setQuantity: (slug: string, variantId: string, quantity: number) => void;
  remove: (slug: string, variantId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

const subscribeNoop = () => () => {};

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  const ready = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [isOpen, setOpen] = useState(false);
  const catalog = useCatalog();
  const cart = useMemo(() => priceCart(lines, catalog), [lines, catalog]);

  // Coming back from a cancelled Stripe checkout: reopen the cart.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("kassa") === "avbruten") {
      url.searchParams.delete("kassa");
      window.history.replaceState(window.history.state, "", url);
      setOpen(true);
    }
  }, []);

  const add = useCallback<CartContextValue["add"]>((items) => {
    for (const i of items) cartStore.add(i.slug, i.variantId, i.quantity);
    setOpen(true);
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      ready,
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
      add,
      setQuantity: cartStore.setQuantity,
      remove: cartStore.remove,
      clear: cartStore.clear,
    }),
    [cart, ready, isOpen, add],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
