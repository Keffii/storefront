"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useCatalog } from "@/components/inventory/InventoryProvider";
import { priceCart, type PricedCart } from "@/lib/cart";
import { cartStore } from "./cartStore";
import { useDelivery } from "./deliveryStore";

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
const SIGNED_IN = /(?:^|;\s*)CognitoIdentityServiceProvider\.[^=]+\.LastAuthUser=/;

export function CartProvider({ children }: { children: ReactNode }) {
  const lines = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  const ready = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const [isOpen, setOpen] = useState(false);
  const catalog = useCatalog();
  const [delivery] = useDelivery();
  const cart = useMemo(() => priceCart(lines, catalog, delivery.method), [lines, catalog, delivery.method]);

  // Coming back from a cancelled Stripe checkout, or from the reminder email
  // (?varukorg=fortsatt): open the cart. From the email on another device the
  // local cart is empty, so the account's saved cart is brought back.
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromCheckout = url.searchParams.get("kassa") === "avbruten";
    const fromReminder = url.searchParams.get("varukorg") === "fortsatt";
    if (!fromCheckout && !fromReminder) return;
    url.searchParams.delete("kassa");
    url.searchParams.delete("varukorg");
    window.history.replaceState(window.history.state, "", url);
    setOpen(true);
    if (fromReminder && cartStore.getSnapshot().length === 0 && SIGNED_IN.test(document.cookie)) {
      fetch("/api/konto/varukorg", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { lines: [] }))
        .then((d: { lines: { slug: string; variantId: string; quantity: number }[] }) => {
          for (const l of d.lines) cartStore.add(l.slug, l.variantId, l.quantity);
        })
        .catch(() => {});
    }
  }, []);

  // Signed-in customers: keep a copy of the cart on the account for the
  // reminder email. The server stores it only if they want reminders.
  const firstSync = useRef(true);
  useEffect(() => {
    if (!ready || !SIGNED_IN.test(document.cookie)) return;
    if (firstSync.current) {
      firstSync.current = false;
      return; // nothing changed yet on this page view
    }
    const id = window.setTimeout(() => {
      void fetch("/api/konto/varukorg", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ lines }),
        keepalive: true,
      }).catch(() => {});
    }, 2500);
    return () => window.clearTimeout(id);
  }, [lines, ready]);

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
