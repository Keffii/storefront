/**
 * Typed product model. All money is in öre (integer minor units) so that
 * maths never touches floats; format with formatPrice().
 */

export type Money = number;

export type CategoryId = "belysning" | "vaser" | "mobler" | "bordsartiklar";

export interface Category {
  id: CategoryId;
  name: string;
  description: string;
  /** Image used on category tiles. */
  image: ProductImage;
}

export interface ProductImage {
  src: string;
  alt: string;
  width: number;
  height: number;
}

/** One selectable option axis, e.g. "Färg" or "Storlek". */
export interface OptionDefinition {
  id: "color" | "size";
  label: string;
  values: OptionValue[];
}

export interface OptionValue {
  id: string;
  label: string;
  /** CSS colour for swatch rendering (colour options only). */
  swatch?: string;
}

export interface Variant {
  id: string;
  sku: string;
  /** Option value ids keyed by option id, e.g. { color: "grafit", size: "m" }. */
  options: Partial<Record<OptionDefinition["id"], string>>;
  price: Money;
  /** Units in stock. 0 = sold out. */
  stock: number;
  images: ProductImage[];
}

export interface Feature {
  id: string;
  title: string;
  body: string;
  image?: ProductImage;
}

export interface Spec {
  label: string;
  value: string;
}

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * A comparison table. Columns are things the shopper is choosing between
 * (e.g. the product's own sizes); cells are text or yes/no.
 */
export interface Comparison {
  columns: { label: string; highlight?: boolean }[];
  rows: { label: string; values: (string | boolean)[] }[];
}

export type BadgeKind = "new" | "bestseller" | "limited";

export interface Product {
  slug: string;
  name: string;
  /** One line under the name. */
  tagline: string;
  description: string;
  category: CategoryId;
  badges: BadgeKind[];
  options: OptionDefinition[];
  variants: Variant[];
  /** Variant shown first. */
  defaultVariantId: string;
  features: Feature[];
  specs: Spec[];
  comparison?: Comparison;
  inTheBox: string[];
  faq: FaqItem[];
  /** Slugs of add-on products offered as "Köp till och spara". */
  addOns: AddOnOffer[];
  /** Shown on the home page when true. */
  featured: boolean;
  /** Hidden products aren't listed, can't be bought and their page is a 404. Default true. */
  published?: boolean;
}

export interface AddOnOffer {
  slug: string;
  /** Discount in öre when bought together with the parent product. */
  bundleDiscount: Money;
}

export interface SiteConfig {
  brandName: string;
  tagline: string;
  currency: "SEK";
  locale: "sv-SE";
  freeShippingThreshold: Money;
  shippingFee: Money;
  /** Orders placed before this hour (Stockholm time) on a weekday ship the same day. */
  shippingCutoffHour: number;
  deliveryDays: { min: number; max: number };
  returnDays: number;
  warrantyYears: number;
}
