/**
 * The product editor's data model and validation. The editor works with
 * colours, sizes and a price/stock per combination; this module turns that
 * into the shop's Product shape (variants with their own images) and back.
 * Pure, so the browser form and the server action validate the same way.
 */
import type { BadgeKind, CategoryId, OptionValue, Product, ProductImage, Variant } from "./types";

export interface EditorColor extends OptionValue {
  swatch: string;
  images: ProductImage[];
}

export interface EditorCombination {
  color: string;
  size: string; // "" when the product has no sizes
  price: number; // kronor, as typed
  stock: number; // starting stock
}

export interface ProductDraft {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: CategoryId;
  badges: BadgeKind[];
  featured: boolean;
  published: boolean;
  colorLabel: string; // e.g. "Färg" or "Ljusfärg"
  colors: EditorColor[];
  sizes: OptionValue[];
  combinations: EditorCombination[];
  defaultColor: string;
  features: { id: string; title: string; body: string; imageSrc?: string }[];
  specs: { label: string; value: string }[];
  inTheBox: string[];
  faq: { question: string; answer: string }[];
  addOns: { slug: string; discountKr: number }[];
}

export type DraftErrors = Record<string, string>;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const CATEGORIES: CategoryId[] = ["belysning", "vaser", "mobler", "bordsartiklar"];
const BADGES: BadgeKind[] = ["new", "bestseller", "limited"];

/** "Rökgrå" → "rokgra" */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const comboKey = (color: string, size: string) => (size ? `${color}-${size}` : color);

/** Converts a shop product into an editable draft. */
export function toDraft(p: Product): ProductDraft {
  const colorOpt = p.options.find((o) => o.id === "color");
  const sizeOpt = p.options.find((o) => o.id === "size");
  const colors: EditorColor[] = (colorOpt?.values ?? []).map((c) => ({
    id: c.id,
    label: c.label,
    swatch: c.swatch ?? "#cccccc",
    images: p.variants.find((v) => v.options.color === c.id)?.images ?? [],
  }));
  return {
    slug: p.slug,
    name: p.name,
    tagline: p.tagline,
    description: p.description,
    category: p.category,
    badges: p.badges,
    featured: p.featured,
    published: p.published !== false,
    colorLabel: colorOpt?.label ?? "Färg",
    colors,
    sizes: sizeOpt?.values ?? [],
    combinations: p.variants.map((v) => ({
      color: v.options.color ?? "",
      size: v.options.size ?? "",
      price: v.price / 100,
      stock: v.stock,
    })),
    defaultColor: p.variants.find((v) => v.id === p.defaultVariantId)?.options.color ?? colors[0]?.id ?? "",
    features: p.features.map((f) => ({ id: f.id, title: f.title, body: f.body, imageSrc: f.image?.src })),
    specs: p.specs,
    inTheBox: p.inTheBox,
    faq: p.faq,
    addOns: p.addOns.map((a) => ({ slug: a.slug, discountKr: a.bundleDiscount / 100 })),
  };
}

/** Every colour × size pair, keeping values already entered. */
export function syncCombinations(draft: Pick<ProductDraft, "colors" | "sizes" | "combinations">): EditorCombination[] {
  const sizes = draft.sizes.length ? draft.sizes.map((s) => s.id) : [""];
  return draft.colors.flatMap((c) =>
    sizes.map(
      (size) =>
        draft.combinations.find((x) => x.color === c.id && x.size === size) ?? { color: c.id, size, price: 0, stock: 0 },
    ),
  );
}

const clean = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");

/** Validates a draft and builds the Product, or returns field errors. */
export function draftToProduct(
  draft: ProductDraft,
  existing: { slugTaken: boolean; addOnSlugs: string[]; skuPrefix?: string },
  previous?: Product,
): { ok: true; product: Product } | { ok: false; errors: DraftErrors } {
  const e: DraftErrors = {};
  const slug = clean(draft.slug, 60);
  if (!SLUG.test(slug)) e.slug = "Använd små bokstäver, siffror och bindestreck, till exempel halo-bordslampa.";
  else if (existing.slugTaken) e.slug = "Det finns redan en produkt med den adressen.";
  const name = clean(draft.name, 80);
  if (name.length < 2) e.name = "Skriv produktens namn.";
  const tagline = clean(draft.tagline, 140);
  if (!tagline) e.tagline = "Skriv en kort beskrivning på en rad.";
  const description = clean(draft.description, 2000);
  if (description.length < 20) e.description = "Beskrivningen behöver minst 20 tecken.";
  if (!CATEGORIES.includes(draft.category)) e.category = "Välj en kategori.";

  if (draft.colors.length === 0) e.colors = "Lägg till minst en färg.";
  const colorIds = new Set<string>();
  draft.colors.forEach((c, i) => {
    if (!ID.test(c.id) || colorIds.has(c.id)) e[`colors.${i}`] = "Varje färg behöver ett unikt id (små bokstäver).";
    colorIds.add(c.id);
    if (!clean(c.label, 40)) e[`colors.${i}.label`] = "Färgen behöver ett namn.";
    if (!HEX.test(c.swatch)) e[`colors.${i}.swatch`] = "Ange färgen som #rrggbb.";
    if (c.images.length === 0) e[`colors.${i}.images`] = `Ladda upp minst en bild för ${c.label || "färgen"}.`;
  });
  const sizeIds = new Set<string>();
  draft.sizes.forEach((s, i) => {
    if (!ID.test(s.id) || sizeIds.has(s.id)) e[`sizes.${i}`] = "Varje storlek behöver ett unikt id.";
    sizeIds.add(s.id);
    if (!clean(s.label, 40)) e[`sizes.${i}.label`] = "Storleken behöver ett namn.";
  });

  const combos = syncCombinations(draft);
  combos.forEach((c, i) => {
    if (!(c.price >= 1 && c.price <= 100000)) e[`combinations.${i}.price`] = "Priset ska vara mellan 1 och 100 000 kr.";
    if (!(Number.isInteger(c.stock) && c.stock >= 0 && c.stock <= 9999)) e[`combinations.${i}.stock`] = "Lagret ska vara ett heltal mellan 0 och 9 999.";
  });
  if (!colorIds.has(draft.defaultColor)) e.defaultColor = "Välj vilken färg som visas först.";

  for (const a of draft.addOns) {
    if (a.slug === slug || !existing.addOnSlugs.includes(a.slug)) e.addOns = "Tillbehör måste vara andra befintliga produkter.";
    if (!(a.discountKr >= 0 && a.discountKr <= 10000)) e.addOns = "Paketrabatten ska vara mellan 0 och 10 000 kr.";
  }

  if (Object.keys(e).length) return { ok: false, errors: e };

  const prefix = existing.skuPrefix ?? slug.split("-")[0].toUpperCase().slice(0, 8);
  const colorOption = { id: "color" as const, label: clean(draft.colorLabel, 30) || "Färg", values: draft.colors.map(({ id, label, swatch }) => ({ id, label: label.trim(), swatch })) };
  const options = draft.sizes.length
    ? [colorOption, { id: "size" as const, label: "Storlek", values: draft.sizes.map((s) => ({ id: s.id, label: s.label.trim() })) }]
    : [colorOption];
  const allImages = draft.colors.flatMap((c) => c.images);

  const variants: Variant[] = combos.map((c) => {
    const id = comboKey(c.color, c.size);
    return {
      id,
      sku: previous?.variants.find((v) => v.id === id)?.sku ?? `${prefix}-${id.toUpperCase()}`,
      options: c.size ? { color: c.color, size: c.size } : { color: c.color },
      price: Math.round(c.price * 100),
      stock: c.stock,
      images: draft.colors.find((x) => x.id === c.color)!.images,
    };
  });
  const defaultVariant = variants.find((v) => v.options.color === draft.defaultColor) ?? variants[0];

  return {
    ok: true,
    product: {
      slug,
      name,
      tagline,
      description,
      category: draft.category,
      badges: draft.badges.filter((b) => BADGES.includes(b)),
      options,
      variants,
      defaultVariantId: defaultVariant.id,
      features: draft.features
        .filter((f) => f.title.trim() && f.body.trim())
        .map((f, i) => ({
          id: f.id || `funktion-${i + 1}`,
          title: f.title.trim().slice(0, 80),
          body: f.body.trim().slice(0, 600),
          image: allImages.find((img) => img.src === f.imageSrc),
        })),
      specs: draft.specs.filter((s) => s.label.trim() && s.value.trim()).map((s) => ({ label: s.label.trim(), value: s.value.trim() })),
      comparison: previous?.comparison,
      inTheBox: draft.inTheBox.map((x) => x.trim()).filter(Boolean),
      faq: draft.faq.filter((f) => f.question.trim() && f.answer.trim()).map((f) => ({ question: f.question.trim(), answer: f.answer.trim() })),
      addOns: draft.addOns.map((a) => ({ slug: a.slug, bundleDiscount: Math.round(a.discountKr * 100) })),
      featured: draft.featured,
      published: draft.published,
    },
  };
}

export function emptyDraft(): ProductDraft {
  return {
    slug: "",
    name: "",
    tagline: "",
    description: "",
    category: "belysning",
    badges: [],
    featured: false,
    published: false,
    colorLabel: "Färg",
    colors: [],
    sizes: [],
    combinations: [],
    defaultColor: "",
    features: [],
    specs: [],
    inTheBox: [],
    faq: [],
    addOns: [],
  };
}
