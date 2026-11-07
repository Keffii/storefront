import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ComparisonTable } from "@/components/product/ComparisonTable";
import { RatingLine } from "@/components/reviews/RatingLine";
import { ReviewsSection } from "@/components/reviews/ReviewsSection";
import { ProductView } from "@/components/product/ProductView";
import { SectionNav, type SectionLink } from "@/components/product/SectionNav";
import { Accordion } from "@/components/ui/Accordion";
import { SpecRows } from "@/components/ui/SpecRows";
import { getCategory, getDefaultVariant, getPriceRange, getProduct, products, sharedFaq } from "@/data/products";
import type { AddOnChoice } from "@/components/product/BuyBox";
import { isDbConfigured } from "@/lib/server/config";
import { getRatingSummaries, getReviews } from "@/lib/server/reviews";
import styles from "./product.module.css";

// Statically generated, refreshed every 10 minutes and right after a new review.
export const revalidate = 600;

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = getProduct((await params).slug);
  if (!product) return {};
  return { title: product.name, description: `${product.tagline} ${product.description}`.slice(0, 160) };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = getProduct((await params).slug);
  if (!product) notFound();

  const { min, max } = getPriceRange(product);
  const category = getCategory(product.category);
  const faq = [...product.faq, ...sharedFaq()];
  const [reviews, summaries] = await Promise.all([getReviews(product.slug), getRatingSummaries([product.slug])]);
  const summary = summaries[product.slug];

  const addOns: AddOnChoice[] = product.addOns.flatMap((offer) => {
    const p = getProduct(offer.slug);
    if (!p) return [];
    const v = getDefaultVariant(p);
    return v.stock > 0 ? [{ product: p, variant: v, discount: offer.bundleDiscount }] : [];
  });

  const sections: SectionLink[] = [
    product.features.length > 0 && { id: "funktioner", label: "Funktioner" },
    { id: "specifikationer", label: "Specifikationer" },
    product.comparison && { id: "jamfor", label: "Jämför" },
    { id: "recensioner", label: summary.count > 0 ? `Recensioner (${summary.count})` : "Recensioner" },
    { id: "faq", label: "FAQ" },
  ].filter((s): s is SectionLink => Boolean(s));

  return (
    <>
      <div className="container">
        <nav aria-label="Brödsmulor" className={styles.breadcrumbs}>
          <ol role="list">
            <li>
              <Link href="/">Start</Link>
            </li>
            {category && (
              <li>
                <Link href={`/kollektion?kategori=${category.id}`}>{category.name}</Link>
              </li>
            )}
            <li aria-current="page">{product.name}</li>
          </ol>
        </nav>

        <ProductView
          product={product}
          addOns={addOns}
          priceFrom={min !== max}
          rating={<RatingLine summary={summary} href="#recensioner" />}
        />
      </div>

      <SectionNav sections={sections} />

      <div className="container">
        <section className={styles.intro} aria-label="Om produkten">
          <p>{product.description}</p>
        </section>

        {product.features.length > 0 && (
          <section id="funktioner" className={styles.section} aria-labelledby="funktioner-rubrik">
            <h2 id="funktioner-rubrik" className="visually-hidden">
              Funktioner
            </h2>
            <div className={styles.features}>
              {product.features.map((f, i) => (
                <article key={f.id} className={`${styles.feature} ${i % 2 === 1 ? styles.featureFlip : ""}`}>
                  {f.image && (
                    <div className={styles.featureMedia}>
                      <Image
                        src={f.image.src}
                        alt={f.image.alt}
                        width={f.image.width}
                        height={f.image.height}
                        sizes="(min-width: 960px) 50vw, 100vw"
                      />
                    </div>
                  )}
                  <div className={styles.featureText}>
                    <p className="caption">{String(i + 1).padStart(2, "0")}</p>
                    <h3 className={styles.featureTitle}>{f.title}</h3>
                    <p>{f.body}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        <section id="specifikationer" className={styles.section} aria-labelledby="specifikationer-rubrik">
          <div className={styles.twoCol}>
            <div>
              <h2 id="specifikationer-rubrik" className={styles.sectionTitle}>
                Specifikationer
              </h2>
              <SpecRows specs={product.specs} />
            </div>
            <div>
              <h2 className={styles.sectionTitle}>Vad ingår</h2>
              <ul role="list" className={styles.box}>
                {product.inTheBox.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {product.comparison && (
          <section id="jamfor" className={styles.section} aria-labelledby="jamfor-rubrik">
            <h2 id="jamfor-rubrik" className={styles.sectionTitle}>
              Jämför storlekar
            </h2>
            <div className={styles.narrow}>
              <ComparisonTable comparison={product.comparison} caption={`Jämförelse av storlekar för ${product.name}`} />
            </div>
          </section>
        )}

        <section id="recensioner" className={styles.section} aria-labelledby="recensioner-rubrik">
          <h2 id="recensioner-rubrik" className={styles.sectionTitle}>
            Recensioner
          </h2>
          <ReviewsSection
            slug={product.slug}
            productName={product.name}
            reviews={reviews}
            summary={summary}
            enabled={isDbConfigured()}
          />
        </section>

        <section id="faq" className={styles.section} aria-labelledby="faq-rubrik">
          <h2 id="faq-rubrik" className={styles.sectionTitle}>
            Vanliga frågor
          </h2>
          <div className={styles.narrow}>
            <Accordion
              items={faq.map((f, i) => ({ id: `faq-${i}`, title: f.question, content: <p>{f.answer}</p> }))}
            />
          </div>
        </section>
      </div>
    </>
  );
}
