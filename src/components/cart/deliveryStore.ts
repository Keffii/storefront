"use client";

/**
 * The customer's delivery choice (method, pickup point, postal code), saved in
 * localStorage next to the cart so the product page estimate and the cart
 * agree, and synced across tabs.
 */
import { useSyncExternalStore } from "react";
import { DEFAULT_SHIPPING_METHOD, isShippingMethodId, type ShippingMethodId } from "@/lib/shipping";

export interface DeliveryChoice {
  method: ShippingMethodId;
  pickupPointId: string | null;
  postalCode: string;
  /** A gift card code entered in the cart (checked again on the server). */
  giftCardCode: string | null;
}

const STORAGE_KEY = "objekt.delivery.v1";
const DEFAULT: DeliveryChoice = { method: DEFAULT_SHIPPING_METHOD, pickupPointId: null, postalCode: "", giftCardCode: null };

let choice: DeliveryChoice = DEFAULT;
let loaded = false;
const listeners = new Set<() => void>();

function read(): DeliveryChoice {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as Partial<DeliveryChoice>;
    return {
      method: isShippingMethodId(p.method) ? p.method : DEFAULT.method,
      pickupPointId: typeof p.pickupPointId === "string" ? p.pickupPointId : null,
      postalCode: typeof p.postalCode === "string" ? p.postalCode.slice(0, 6) : "",
      giftCardCode: typeof p.giftCardCode === "string" ? p.giftCardCode.slice(0, 20) : null,
    };
  } catch {
    return DEFAULT;
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    choice = read();
    loaded = true;
  }
}

function onStorage(e: StorageEvent) {
  if (e.key === STORAGE_KEY) {
    choice = read();
    listeners.forEach((l) => l());
  }
}

export const deliveryStore = {
  subscribe(listener: () => void) {
    ensureLoaded();
    if (listeners.size === 0) window.addEventListener("storage", onStorage);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (listeners.size === 0) window.removeEventListener("storage", onStorage);
    };
  },
  getSnapshot(): DeliveryChoice {
    ensureLoaded();
    return choice;
  },
  getServerSnapshot(): DeliveryChoice {
    return DEFAULT;
  },
  set(patch: Partial<DeliveryChoice>) {
    ensureLoaded();
    choice = { ...choice, ...patch };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
    } catch {
      // Storage unavailable: the choice still applies to this page view.
    }
    listeners.forEach((l) => l());
  },
};

export function useDelivery(): [DeliveryChoice, (patch: Partial<DeliveryChoice>) => void] {
  const value = useSyncExternalStore(deliveryStore.subscribe, deliveryStore.getSnapshot, deliveryStore.getServerSnapshot);
  return [value, deliveryStore.set];
}
