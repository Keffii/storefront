/**
 * Delivery methods, carriers and tracking links. Pure and shared by the
 * browser (cart, product page) and the server (checkout, emails), so the
 * price and estimate the customer sees are the ones Stripe charges.
 */
import { site } from "@/data/products";
import type { DeliveryConfig } from "./delivery";
import type { Money } from "./types";

export type ShippingMethodId = "ombud" | "hem" | "express";

export interface ShippingMethod extends DeliveryConfig {
  id: ShippingMethodId;
  label: string;
  description: string;
  fee: Money;
  /** The free-shipping threshold applies to this method. */
  freeOverThreshold: boolean;
}

export const SHIPPING_METHODS: ShippingMethod[] = [
  {
    id: "ombud",
    label: "Ombud",
    description: "Hämta hos ett ombud nära dig",
    fee: site.shippingFee,
    freeOverThreshold: true,
    cutoffHour: site.shippingCutoffHour,
    minDays: site.deliveryDays.min,
    maxDays: site.deliveryDays.max,
  },
  {
    id: "hem",
    label: "Hemleverans",
    description: "Till dörren, kvällstid 17–22",
    fee: 7900,
    freeOverThreshold: true,
    cutoffHour: site.shippingCutoffHour,
    minDays: 2,
    maxDays: 4,
  },
  {
    id: "express",
    label: "Express",
    description: "Nästa vardag vid order före kl. 12",
    fee: 14900,
    freeOverThreshold: false,
    cutoffHour: 12,
    minDays: 1,
    maxDays: 1,
  },
];

export const DEFAULT_SHIPPING_METHOD: ShippingMethodId = "ombud";

export function isShippingMethodId(id: unknown): id is ShippingMethodId {
  return SHIPPING_METHODS.some((m) => m.id === id);
}

export function shippingMethod(id: ShippingMethodId | string | null | undefined): ShippingMethod {
  return SHIPPING_METHODS.find((m) => m.id === id) ?? SHIPPING_METHODS[0];
}

/** Shipping for a cart worth `amount` after discounts. Empty carts ship free. */
export function shippingFee(method: ShippingMethod, amount: Money, isEmpty = false): Money {
  if (isEmpty) return 0;
  if (method.freeOverThreshold && amount >= site.freeShippingThreshold) return 0;
  return method.fee;
}

/* ---------- Carriers ---------- */

export type CarrierId = "postnord" | "dhl" | "budbee";

export const CARRIERS: Record<CarrierId, { label: string; trackingUrl: (n: string) => string }> = {
  postnord: { label: "PostNord", trackingUrl: (n) => `https://tracking.postnord.com/se/?id=${encodeURIComponent(n)}` },
  dhl: { label: "DHL", trackingUrl: (n) => `https://www.dhl.com/se-sv/home/tracking.html?tracking-id=${encodeURIComponent(n)}` },
  budbee: { label: "Budbee", trackingUrl: (n) => `https://tracking.budbee.com/${encodeURIComponent(n)}` },
};

export function isCarrierId(id: unknown): id is CarrierId {
  return typeof id === "string" && id in CARRIERS;
}

/** Letters, digits and dashes, as carriers print them. */
export function normaliseTrackingNumber(input: string): string | null {
  const n = input.trim().replace(/\s+/g, "").toUpperCase();
  return /^[A-Z0-9-]{6,40}$/.test(n) ? n : null;
}

export function trackingLink(carrier: string | null | undefined, number: string | null | undefined) {
  if (!isCarrierId(carrier) || !number) return null;
  return { label: CARRIERS[carrier].label, number, url: CARRIERS[carrier].trackingUrl(number) };
}
