/**
 * The single source of truth for the placeholder brand and catalogue.
 * Swapping in a real product range means editing this file (and the images
 * it points to); no component hard-codes product content.
 *
 * Prices are in öre: 149500 = 1 495 kr.
 */
import type {
  Category,
  CategoryId,
  OptionValue,
  Product,
  ProductImage,
  SiteConfig,
  Variant,
} from "@/lib/types";

export const site: SiteConfig = {
  brandName: "Objekt",
  tagline: "Föremål för hemmet, gjorda för att hålla.",
  currency: "SEK",
  locale: "sv-SE",
  freeShippingThreshold: 99900,
  shippingFee: 4900,
  shippingCutoffHour: 14,
  deliveryDays: { min: 1, max: 3 },
  returnDays: 30,
  warrantyYears: 2,
};

/* ---------- Shared option values ---------- */

const color = {
  grafit: { id: "grafit", label: "Grafit", swatch: "#3A3A3A" },
  krita: { id: "krita", label: "Krita", swatch: "#E9E4DA" },
  dimbla: { id: "dimbla", label: "Dimblå", swatch: "#7C8BA3" },
  terrakotta: { id: "terrakotta", label: "Terrakotta", swatch: "#B86B4B" },
  olivgron: { id: "olivgron", label: "Olivgrön", swatch: "#7D7F5C" },
  sand: { id: "sand", label: "Sand", swatch: "#CDBB9B" },
  klar: { id: "klar", label: "Klar", swatch: "#CFDCDA" },
  rokgra: { id: "rokgra", label: "Rökgrå", swatch: "#8E8C88" },
  varmvit: { id: "varmvit", label: "Varmvit", swatch: "#F1E6C4" },
  linne: { id: "linne", label: "Linne", swatch: "#D6CBB8" },
} satisfies Record<string, OptionValue>;

type ColorId = keyof typeof color;

/** The three generated views for one colour of one product. */
function images(slug: string, colorId: ColorId, objectName: string): ProductImage[] {
  const label = color[colorId].label.toLowerCase();
  return [
    { src: `/images/products/${slug}-${colorId}-1.svg`, alt: `${objectName} i ${label}, framifrån`, width: 1200, height: 1200 },
    { src: `/images/products/${slug}-${colorId}-2.svg`, alt: `${objectName} i ${label} på en sockel`, width: 1200, height: 1200 },
    { src: `/images/products/${slug}-${colorId}-3.svg`, alt: `${objectName} i ${label}, detalj`, width: 1200, height: 1200 },
  ];
}

/**
 * Builds a variant for every colour × size combination. Products without a
 * size option pass a single size with an empty id.
 */
function variants(
  slug: string,
  skuPrefix: string,
  objectName: string,
  colors: ColorId[],
  sizes: { id: string; price: number }[],
  stock: Record<string, number> = {},
  defaultStock = 25,
): Variant[] {
  return colors.flatMap((c) =>
    sizes.map((s) => {
      const id = s.id ? `${c}-${s.id}` : c;
      return {
        id,
        sku: `${skuPrefix}-${id.toUpperCase()}`,
        options: s.id ? { color: c, size: s.id } : { color: c },
        price: s.price,
        stock: stock[id] ?? defaultStock,
        images: images(slug, c, objectName),
      };
    }),
  );
}

/* ---------- Products ---------- */

export const products: Product[] = [
  {
    slug: "halo-bordslampa",
    name: "Halo bordslampa",
    tagline: "Mjukt, bländfritt ljus för sidobordet.",
    description:
      "En bordslampa med kupad skärm som riktar ljuset nedåt och bort från ögonen. Dimbar i tre steg med en tryckknapp i foten.",
    category: "belysning",
    badges: ["bestseller"],
    options: [
      { id: "color", label: "Färg", values: [color.grafit, color.krita, color.dimbla] },
      {
        id: "size",
        label: "Storlek",
        values: [
          { id: "s", label: "Liten · 32 cm" },
          { id: "l", label: "Stor · 46 cm" },
        ],
      },
    ],
    variants: variants(
      "halo-bordslampa",
      "HALO",
      "Halo bordslampa",
      ["grafit", "krita", "dimbla"],
      [
        { id: "s", price: 149500 },
        { id: "l", price: 199500 },
      ],
      { "krita-l": 3, "dimbla-l": 0 },
    ),
    defaultVariantId: "grafit-s",
    features: [
      { id: "ljus", title: "Ljus som inte bländar", body: "Skärmen döljer ljuskällan från alla vanliga betraktningsvinklar." },
      { id: "dimmer", title: "Tre ljuslägen", body: "Tryck på foten för att växla mellan 100, 50 och 15 procent." },
      { id: "material", title: "Pulverlackerat stål", body: "Tålig yta som inte flagnar och är lätt att torka av." },
    ],
    specs: [
      { label: "Höjd", value: "32 cm (liten) / 46 cm (stor)" },
      { label: "Skärmens diameter", value: "24 cm / 32 cm" },
      { label: "Material", value: "Pulverlackerat stål" },
      { label: "Ljuskälla", value: "E14, max 6 W LED (ingår ej)" },
      { label: "Sladd", value: "2 m textilsladd" },
      { label: "Vikt", value: "1,4 kg / 2,1 kg" },
    ],
    inTheBox: ["Bordslampa", "Textilsladd med stickpropp", "Snabbguide"],
    faq: [
      { question: "Ingår glödlampa?", answer: "Nej. Lampan tar en E14-sockel och vi rekommenderar en varmvit LED på max 6 W." },
      { question: "Fungerar dimmern med alla lampor?", answer: "Den fungerar med dimbara LED-lampor. Vanliga LED-lampor kan flimra i de lägre lägena." },
    ],
    addOns: [{ slug: "led-glodlampa", bundleDiscount: 3000 }],
    featured: true,
  },
  {
    slug: "ovo-vas",
    name: "Ovo vas",
    tagline: "Handdrejad stengodsvas med smal hals.",
    description:
      "En äggformad vas i glaserat stengods. Den smala halsen håller några få stjälkar upprätt, eller står vacker helt tom.",
    category: "vaser",
    badges: ["new"],
    options: [
      { id: "color", label: "Färg", values: [color.terrakotta, color.krita, color.olivgron] },
      {
        id: "size",
        label: "Storlek",
        values: [
          { id: "s", label: "Liten · 18 cm" },
          { id: "m", label: "Mellan · 26 cm" },
        ],
      },
    ],
    variants: variants(
      "ovo-vas",
      "OVO",
      "Ovo vas",
      ["terrakotta", "krita", "olivgron"],
      [
        { id: "s", price: 59500 },
        { id: "m", price: 79500 },
      ],
      { "olivgron-m": 4 },
    ),
    defaultVariantId: "terrakotta-s",
    features: [
      { id: "handgjord", title: "Handdrejad", body: "Varje vas formas för hand, så små variationer är en del av uttrycket." },
      { id: "tat", title: "Vattentät glasyr", body: "Glaserad både in- och utvändigt." },
    ],
    specs: [
      { label: "Höjd", value: "18 cm / 26 cm" },
      { label: "Material", value: "Glaserat stengods" },
      { label: "Diskmaskin", value: "Nej, diska för hand" },
    ],
    inTheBox: ["Vas"],
    faq: [{ question: "Är vasen vattentät?", answer: "Ja, den är glaserad invändigt och tål vatten." }],
    addOns: [{ slug: "skotselduk", bundleDiscount: 2000 }],
    featured: true,
  },
  {
    slug: "rund-pall",
    name: "Rund pall",
    tagline: "En pall som också fungerar som sidobord.",
    description: "Tre ben och en rund sits i massivt trä. Lätt att flytta, stabil att sitta på.",
    category: "mobler",
    badges: [],
    options: [{ id: "color", label: "Färg", values: [color.grafit, color.sand] }],
    variants: variants("rund-pall", "PALL", "Rund pall", ["grafit", "sand"], [{ id: "", price: 249500 }]),
    defaultVariantId: "sand",
    features: [
      { id: "massiv", title: "Massiv ask", body: "Sits och ben i massivt askträ, oljat eller betsat." },
      { id: "stabil", title: "Stabil på ojämna golv", body: "Tre ben står alltid stadigt." },
    ],
    specs: [
      { label: "Höjd", value: "45 cm" },
      { label: "Sitsens diameter", value: "36 cm" },
      { label: "Material", value: "Massiv ask" },
      { label: "Maxbelastning", value: "120 kg" },
    ],
    inTheBox: ["Sits", "3 ben", "Monteringsanvisning"],
    faq: [{ question: "Behöver den monteras?", answer: "Benen skruvas fast för hand på några minuter. Inga verktyg behövs." }],
    addOns: [{ slug: "skotselduk", bundleDiscount: 2000 }],
    featured: true,
  },
  {
    slug: "lag-skal",
    name: "Låg skål",
    tagline: "Bred serveringsskål för fruktfat och sallad.",
    description: "En låg, bred skål i stengods med matt utsida och blank insida.",
    category: "bordsartiklar",
    badges: [],
    options: [{ id: "color", label: "Färg", values: [color.krita, color.grafit, color.dimbla] }],
    variants: variants("lag-skal", "SKAL", "Låg skål", ["krita", "grafit", "dimbla"], [{ id: "", price: 39500 }], {
      dimbla: 0,
    }),
    defaultVariantId: "krita",
    features: [{ id: "disk", title: "Tål diskmaskin", body: "Glasyren tål diskmaskin och mikrovågsugn." }],
    specs: [
      { label: "Diameter", value: "28 cm" },
      { label: "Höjd", value: "9 cm" },
      { label: "Material", value: "Stengods" },
    ],
    inTheBox: ["Skål"],
    faq: [],
    addOns: [],
    featured: true,
  },
  {
    slug: "klar-karaff",
    name: "Klar karaff",
    tagline: "Munblåst glaskaraff, 1 liter.",
    description: "En enkel karaff i munblåst glas som häller utan att droppa.",
    category: "bordsartiklar",
    badges: ["limited"],
    options: [{ id: "color", label: "Färg", values: [color.klar, color.rokgra] }],
    variants: variants("klar-karaff", "KARAFF", "Klar karaff", ["klar", "rokgra"], [{ id: "", price: 49500 }], {
      rokgra: 6,
    }),
    defaultVariantId: "klar",
    features: [{ id: "pip", title: "Droppfri pip", body: "Pipens kant är slipad så att den häller rent." }],
    specs: [
      { label: "Volym", value: "1 liter" },
      { label: "Höjd", value: "24 cm" },
      { label: "Material", value: "Munblåst glas" },
    ],
    inTheBox: ["Karaff"],
    faq: [],
    addOns: [],
    featured: false,
  },
  {
    slug: "pelare-ljusstake",
    name: "Pelare ljusstake",
    tagline: "Tung ljusstake i massiv mässing eller lackerat stål.",
    description: "En cylindrisk ljusstake för vanliga kronljus.",
    category: "belysning",
    badges: [],
    options: [{ id: "color", label: "Färg", values: [color.sand, color.grafit] }],
    variants: variants("pelare-ljusstake", "PELARE", "Pelare ljusstake", ["sand", "grafit"], [{ id: "", price: 34500 }]),
    defaultVariantId: "sand",
    features: [{ id: "tung", title: "Står stadigt", body: "Tung fot som inte välter." }],
    specs: [
      { label: "Höjd", value: "12 cm" },
      { label: "Passar", value: "Kronljus 2,2 cm" },
    ],
    inTheBox: ["Ljusstake"],
    faq: [],
    addOns: [],
    featured: false,
  },
  /* Add-ons: sold on their own too, offered as "Köp till och spara". */
  {
    slug: "led-glodlampa",
    name: "LED-glödlampa E14",
    tagline: "Dimbar, varmvit 2 700 K.",
    description: "En dimbar LED-lampa med varmt ljus som passar Halo bordslampa.",
    category: "belysning",
    badges: [],
    options: [{ id: "color", label: "Ljusfärg", values: [color.varmvit] }],
    variants: variants("led-glodlampa", "LED", "LED-glödlampa", ["varmvit"], [{ id: "", price: 14900 }]),
    defaultVariantId: "varmvit",
    features: [],
    specs: [
      { label: "Sockel", value: "E14" },
      { label: "Effekt", value: "5 W (motsvarar 40 W)" },
      { label: "Färgtemperatur", value: "2 700 K" },
    ],
    inTheBox: ["Glödlampa"],
    faq: [],
    addOns: [],
    featured: false,
  },
  {
    slug: "skotselduk",
    name: "Skötselduk",
    tagline: "Mjuk linneduk för trä, keramik och metall.",
    description: "En luddfri duk som tar bort damm och fingeravtryck utan rengöringsmedel.",
    category: "bordsartiklar",
    badges: [],
    options: [{ id: "color", label: "Färg", values: [color.linne] }],
    variants: variants("skotselduk", "DUK", "Skötselduk", ["linne"], [{ id: "", price: 9900 }]),
    defaultVariantId: "linne",
    features: [],
    specs: [
      { label: "Mått", value: "40 × 40 cm" },
      { label: "Material", value: "100 % linne" },
    ],
    inTheBox: ["Duk"],
    faq: [],
    addOns: [],
    featured: false,
  },
];

export const categories: Category[] = [
  {
    id: "belysning",
    name: "Belysning",
    description: "Lampor och ljusstakar",
    image: images("halo-bordslampa", "krita", "Halo bordslampa")[0],
  },
  {
    id: "vaser",
    name: "Vaser",
    description: "Handdrejat stengods",
    image: images("ovo-vas", "terrakotta", "Ovo vas")[0],
  },
  {
    id: "mobler",
    name: "Möbler",
    description: "Pallar och små bord",
    image: images("rund-pall", "sand", "Rund pall")[0],
  },
  {
    id: "bordsartiklar",
    name: "Bordsartiklar",
    description: "Skålar och karaffer",
    image: images("lag-skal", "grafit", "Låg skål")[0],
  },
];

/* ---------- Lookups ---------- */

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getCategory(id: CategoryId): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function getDefaultVariant(product: Product): Variant {
  return product.variants.find((v) => v.id === product.defaultVariantId) ?? product.variants[0];
}

/** Lowest price across variants – used for "från 1 495 kr" on cards. */
export function getPriceRange(product: Product): { min: number; max: number } {
  const prices = product.variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function isAddOnOnly(product: Product): boolean {
  return products.some((p) => p.addOns.some((a) => a.slug === product.slug));
}

export const featuredProducts = () => products.filter((p) => p.featured);
