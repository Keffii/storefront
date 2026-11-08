/**
 * schema.org JSON-LD builders. Ratings are only included when real reviews
 * exist, as Google's guidelines require.
 */
import { site } from "@/data/products";
import type { RatingSummary } from "./reviews";
import { absoluteUrl } from "./site-url";
import type { Category, FaqItem, Product } from "./types";
import { variantLabel } from "./variants";

const sek = (ore: number) => (ore / 100).toFixed(2);

export function productJsonLd(product: Product, rating: RatingSummary) {
  const url = absoluteUrl(`/produkter/${product.slug}`);
  return {
    "@context": "https://schema.org",
    "@type": "ProductGroup",
    name: product.name,
    description: product.description,
    url,
    brand: { "@type": "Brand", name: site.brandName },
    productGroupID: product.slug,
    variesBy: product.options.map((o) => (o.id === "color" ? "https://schema.org/color" : "https://schema.org/size")),
    hasVariant: product.variants.map((v) => ({
      "@type": "Product",
      sku: v.sku,
      name: variantLabel(product, v),
      image: absoluteUrl(v.images[0].src),
      color: product.options.find((o) => o.id === "color")?.values.find((x) => x.id === v.options.color)?.label,
      size: product.options.find((o) => o.id === "size")?.values.find((x) => x.id === v.options.size)?.label,
      offers: {
        "@type": "Offer",
        url: `${url}?variant=${v.id}`,
        priceCurrency: "SEK",
        price: sek(v.price),
        availability: v.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        itemCondition: "https://schema.org/NewCondition",
        shippingDetails: {
          "@type": "OfferShippingDetails",
          shippingRate: { "@type": "MonetaryAmount", value: sek(v.price >= site.freeShippingThreshold ? 0 : site.shippingFee), currency: "SEK" },
          shippingDestination: { "@type": "DefinedRegion", addressCountry: "SE" },
          deliveryTime: {
            "@type": "ShippingDeliveryTime",
            handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 1, unitCode: "DAY" },
            transitTime: {
              "@type": "QuantitativeValue",
              minValue: site.deliveryDays.min,
              maxValue: site.deliveryDays.max,
              unitCode: "DAY",
            },
          },
        },
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          applicableCountry: "SE",
          returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
          merchantReturnDays: site.returnDays,
        },
      },
    })),
    ...(rating.count > 0 && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: rating.average,
        reviewCount: rating.count,
        bestRating: 5,
        worstRating: 1,
      },
    }),
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function faqJsonLd(faq: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  };
}

export function storeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "OnlineStore",
    name: site.brandName,
    description: site.tagline,
    url: absoluteUrl("/"),
    currenciesAccepted: "SEK",
    paymentAccepted: "Kort, Klarna",
  };
}

export const categoryBreadcrumb = (c: Category) => ({ name: c.name, path: `/kollektion/${c.id}` });

/** Renders JSON-LD safely: "<" is escaped so content can't close the script tag. */
export function jsonLdScript(data: unknown) {
  return { __html: JSON.stringify(data).replace(/</g, "\\u003c") };
}
