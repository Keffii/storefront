import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Accordion } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { Price } from "@/components/ui/Price";
import { SpecRows } from "@/components/ui/SpecRows";
import { FloatingBuyCard } from "@/components/patterns/FloatingBuyCard";
import { getCategory, getDefaultVariant, getPriceRange, getProduct, products, site } from "@/data/products";
import { formatPrice } from "@/lib/format";
import styles from "./product.module.css";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = getProduct((await params).slug);
  if (!product) return {};
  return { title: product.name, description: product.tagline };
}

// Phase 1: a static layout of the product page using the core components.
// Phase 2 makes the buy box interactive (variant state, stock, add-ons, delivery estimate).
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const product = getProduct((await params).slug);
  if (!product) notFound();

  const variant = getDefaultVariant(product);
  const { min, max } = getPriceRange(product);
  const category = getCategory(product.category);

  return (
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

      <div className={styles.layout}>
        <div className={styles.gallery}>
          {variant.images.map((img, i) => (
            <div key={img.src} className={styles.galleryItem}>
              <Image
                src={img.src}
                alt={img.alt}
                width={img.width}
                height={img.height}
                priority={i === 0}
                sizes="(min-width: 960px) 30vw, 100vw"
              />
            </div>
          ))}
        </div>

        <FloatingBuyCard>
          {product.badges.length > 0 && (
            <div className={styles.badges}>
              {product.badges.map((b) => (
                <Badge key={b} kind={b} />
              ))}
            </div>
          )}
          <div>
            <h1 className={styles.name}>{product.name}</h1>
            <p className={styles.tagline}>{product.tagline}</p>
          </div>
          <Price amount={variant.price} from={min !== max} size="lg" />
          {product.options.map((o) => (
            <OptionPicker key={o.id} option={o} defaultValue={variant.options[o.id]} />
          ))}
          <Button size="lg" fullWidth disabled>
            Lägg i varukorgen
          </Button>
          <ul role="list" className={styles.trust}>
            <li>Fri frakt över {formatPrice(site.freeShippingThreshold)}</li>
            <li>{site.returnDays} dagars öppet köp</li>
            <li>{site.warrantyYears} års garanti</li>
          </ul>
        </FloatingBuyCard>
      </div>

      <section className={styles.section} aria-labelledby="about-heading">
        <h2 id="about-heading" className={styles.sectionTitle}>
          Om produkten
        </h2>
        <p className={styles.description}>{product.description}</p>
      </section>

      <section className={styles.section} aria-labelledby="specs-heading">
        <h2 id="specs-heading" className={styles.sectionTitle}>
          Specifikationer
        </h2>
        <SpecRows specs={product.specs} />
      </section>

      <section className={styles.section} aria-labelledby="faq-heading">
        <h2 id="faq-heading" className={styles.sectionTitle}>
          Vanliga frågor
        </h2>
        <Accordion
          items={[
            {
              id: "box",
              title: "Vad ingår?",
              content: (
                <ul>
                  {product.inTheBox.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ),
            },
            ...product.faq.map((f, i) => ({ id: `faq-${i}`, title: f.question, content: <p>{f.answer}</p> })),
          ]}
        />
      </section>
    </div>
  );
}
