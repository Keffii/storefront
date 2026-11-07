"use client";

/**
 * A tiny external store for the cart lines, persisted in localStorage and
 * kept in sync across tabs through the `storage` event. Read it with
 * useSyncExternalStore so server rendering and hydration stay consistent.
 */
import { normaliseLines, type CartLine } from "@/lib/cart";

const STORAGE_KEY = "objekt.cart.v1";
const EMPTY: CartLine[] = [];

let lines: CartLine[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? normaliseLines(parsed as CartLine[]) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    lines = read();
    loaded = true;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

function write(next: CartLine[]) {
  lines = normaliseLines(next);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
  } catch {
    // Private mode or storage full: the cart still works for this page view.
  }
  emit();
}

function onStorage(e: StorageEvent) {
  if (e.key === STORAGE_KEY) {
    lines = read();
    emit();
  }
}

export const cartStore = {
  subscribe(listener: () => void) {
    ensureLoaded();
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(): CartLine[] {
    ensureLoaded();
    return lines;
  },
  getServerSnapshot(): CartLine[] {
    return EMPTY;
  },
  add(slug: string, variantId: string, quantity = 1) {
    ensureLoaded();
    write([...lines, { slug, variantId, quantity }]);
  },
  setQuantity(slug: string, variantId: string, quantity: number) {
    ensureLoaded();
    write(lines.map((l) => (l.slug === slug && l.variantId === variantId ? { ...l, quantity } : l)));
  },
  remove(slug: string, variantId: string) {
    ensureLoaded();
    write(lines.filter((l) => !(l.slug === slug && l.variantId === variantId)));
  },
  clear() {
    ensureLoaded();
    write(EMPTY);
  },
};
