/**
 * Cart pricing. Pure functions shared by the browser (cart drawer) and the
 * server (checkout route), so the customer sees exactly what Stripe charges.
 * The server never trusts client prices: it re-runs priceCart on the ids.
 */
import { products as catalog, sets as allSets, site } from "@/data/products";
import { DEFAULT_SHIPPING_METHOD, shippingFee, shippingMethod, type ShippingMethodId } from "./shipping";
import type { Money, Product, ProductSet, Variant } from "./types";

export const MAX_QUANTITY = 10;

export interface CartLine {
  slug: string;
  variantId: string;
  quantity: number;
}

export interface PricedLine extends CartLine {
  key: string;
  product: Product;
  variant: Variant;
  unitPrice: Money;
  /** Total bundle discount on this line (not per unit). */
  discount: Money;
  /** unitPrice × quantity − discount */
  total: Money;
  /** Units the bundle discount applies to. */
  discountedUnits: number;
  /** What the discount is for: an add-on bundle or a set. */
  discountKind?: "bundle" | "set";
}

export interface PricedCart {
  lines: PricedLine[];
  /** Lines that were dropped: unknown product/variant or sold out. */
  removed: CartLine[];
  itemCount: number;
  subtotal: Money; // before discounts
  discount: Money;
  shipping: Money;
  shippingMethod: ShippingMethodId;
  total: Money;
  freeShippingRemaining: Money;
  qualifiesForFreeShipping: boolean;
}

export const lineKey = (l: Pick<CartLine, "slug" | "variantId">) => `${l.slug}:${l.variantId}`;

export function clampQuantity(quantity: number, stock: number): number {
  if (!Number.isFinite(quantity)) return 1;
  return Math.max(1, Math.min(Math.floor(quantity), MAX_QUANTITY, Math.max(stock, 1)));
}

/** Merges duplicate lines and clamps quantities. */
export function normaliseLines(lines: CartLine[]): CartLine[] {
  const merged = new Map<string, CartLine>();
  for (const l of lines) {
    if (!l || typeof l.slug !== "string" || typeof l.variantId !== "string") continue;
    const k = lineKey(l);
    const prev = merged.get(k);
    merged.set(k, { slug: l.slug, variantId: l.variantId, quantity: (prev?.quantity ?? 0) + (Number(l.quantity) || 0) });
  }
  return [...merged.values()].filter((l) => l.quantity > 0);
}

/**
 * Bundle discount: an add-on offered by a product in the cart gets its
 * discount on as many units as there are units of the parent products.
 */
function bundleDiscountFor(addOnSlug: string, lines: { product: Product; quantity: number }[]) {
  let perUnit = 0;
  let parentUnits = 0;
  for (const l of lines) {
    const offer = l.product.addOns.find((a) => a.slug === addOnSlug);
    if (offer) {
      perUnit = Math.max(perUnit, offer.bundleDiscount);
      parentUnits += l.quantity;
    }
  }
  return { perUnit, parentUnits };
}

export function priceCart(
  input: CartLine[],
  products: Product[] = catalog,
  method: ShippingMethodId = DEFAULT_SHIPPING_METHOD,
  sets: ProductSet[] = allSets,
): PricedCart {
  const lookup = (slug: string) => products.find((p) => p.slug === slug);
  const removed: CartLine[] = [];
  const resolved: { line: CartLine; product: Product; variant: Variant; quantity: number }[] = [];

  for (const line of normaliseLines(input)) {
    const product = lookup(line.slug);
    const variant = product?.variants.find((v) => v.id === line.variantId);
    if (!product || !variant || variant.stock <= 0) {
      removed.push(line);
      continue;
    }
    resolved.push({ line, product, variant, quantity: clampQuantity(line.quantity, variant.stock) });
  }

  const lines: PricedLine[] = resolved.map(({ product, variant, quantity }) => {
    const { perUnit, parentUnits } = bundleDiscountFor(product.slug, resolved);
    const discountedUnits = Math.min(quantity, parentUnits);
    const discount = perUnit * discountedUnits;
    const unitPrice = variant.price;
    return {
      key: lineKey({ slug: product.slug, variantId: variant.id }),
      slug: product.slug,
      variantId: variant.id,
      quantity,
      product,
      variant,
      unitPrice,
      discount,
      discountedUnits,
      ...(discount > 0 ? { discountKind: "bundle" as const } : {}),
      total: unitPrice * quantity - discount,
    };
  });

  applySetPrices(lines, sets);

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const discount = lines.reduce((s, l) => s + l.discount, 0);
  const afterDiscount = subtotal - discount;
  const qualifiesForFreeShipping = afterDiscount >= site.freeShippingThreshold;
  const shipping = shippingFee(shippingMethod(method), afterDiscount, lines.length === 0);

  return {
    lines,
    removed,
    itemCount: lines.reduce((s, l) => s + l.quantity, 0),
    subtotal,
    discount,
    shipping,
    shippingMethod: shippingMethod(method).id,
    total: afterDiscount + shipping,
    freeShippingRemaining: Math.max(0, site.freeShippingThreshold - afterDiscount),
    qualifiesForFreeShipping,
  };
}

/**
 * Set prices: for every complete set in the cart (one of each product), the
 * set's saving is spread over its lines in whole kronor, so the sum is exact
 * and Stripe can charge each line. Lines that already have a bundle
 * discount don't take part, so two discounts never stack on one unit.
 */
function applySetPrices(lines: PricedLine[], sets: ProductSet[]) {
  for (const set of sets) {
    const members = set.slugs.map((slug) => lines.find((l) => l.slug === slug && l.discount === 0));
    if (members.some((m) => !m)) continue;
    const ms = members as PricedLine[];
    const count = Math.min(...ms.map((m) => m.quantity));
    const full = ms.reduce((s, m) => s + m.unitPrice, 0);
    const saving = full - set.price;
    if (count < 1 || saving <= 0) continue;
    let left = saving;
    ms.forEach((m, i) => {
      // Whole kronor per line (prices are in öre), the last line takes the rest,
      // so the cart shows 153 kr rather than 153,47 kr and the sum stays exact.
      const share = i === ms.length - 1 ? left : Math.min(left, Math.round((saving * m.unitPrice) / full / 100) * 100);
      left -= share;
      m.discount = share * count;
      m.discountedUnits = count;
      m.discountKind = "set";
      m.total = m.unitPrice * m.quantity - m.discount;
    });
  }
}

/** Sets a product belongs to, with their full price and saving. */
export function setsFor(slug: string, products: Product[] = catalog, sets: ProductSet[] = allSets) {
  return sets
    .filter((s) => s.slugs.includes(slug))
    .map((s) => {
      const items = s.slugs.map((x) => products.find((p) => p.slug === x)).filter((p): p is Product => Boolean(p));
      const full = items.reduce((sum, p) => sum + (p.variants.find((v) => v.id === p.defaultVariantId) ?? p.variants[0]).price, 0);
      return { set: s, items, full, saving: full - s.price };
    })
    .filter((s) => s.items.length === s.set.slugs.length && s.saving > 0);
}

/**
 * One add-on to suggest in the cart: an add-on of a product in the cart that
 * isn't in the cart yet and is in stock.
 */
export function suggestAddOn(cart: PricedCart, products: Product[] = catalog) {
  const inCart = new Set(cart.lines.map((l) => l.slug));
  for (const line of cart.lines) {
    for (const offer of line.product.addOns) {
      if (inCart.has(offer.slug)) continue;
      const product = products.find((p) => p.slug === offer.slug);
      const variant = product?.variants.find((v) => v.id === product.defaultVariantId && v.stock > 0);
      if (product && variant) return { product, variant, offer, parent: line.product };
    }
  }
  return null;
}
