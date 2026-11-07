import { Button } from "@/components/ui/Button";
import { CategoryGrid } from "@/components/patterns/CategoryGrid";
import { Hero } from "@/components/patterns/Hero";
import { ProductGrid } from "@/components/patterns/ProductGrid";
import { SplitPanel } from "@/components/patterns/SplitPanel";
import { categories, featuredProducts, getDefaultVariant, getProduct, site } from "@/data/products";
import { formatPrice } from "@/lib/format";
import styles from "./home.module.css";

export default function HomePage() {
  const featured = featuredProducts();
  const spotlight = getProduct("halo-bordslampa");

  return (
    <>
      <Hero
        eyebrow="Nytt i belysning"
        title="Ljus som inte bländar"
        body="Halo bordslampa – kupad skärm, tre ljuslägen, i tre färger."
        image={{ src: "/images/hero.svg", alt: "En tänd bordslampa på en skänk i ett mörkt rum" }}
        actions={
          <>
            <Button href="/produkter/halo-bordslampa" variant="inverse" size="lg">
              Se lampan
            </Button>
          </>
        }
      />

      <section className={`container ${styles.section}`} aria-labelledby="featured-heading">
        <div className={styles.sectionHead}>
          <h2 id="featured-heading" className={styles.heading}>
            Utvalda föremål
          </h2>
          <Button href="/kollektion" variant="ghost">
            Visa alla
          </Button>
        </div>
        <ProductGrid products={featured} />
      </section>

      <section className={`container ${styles.section}`} aria-labelledby="categories-heading">
        <div className={styles.sectionHead}>
          <h2 id="categories-heading" className={styles.heading}>
            Handla efter kategori
          </h2>
        </div>
        <CategoryGrid categories={categories} />
      </section>

      {spotlight && (
        <div className={styles.section}>
          <SplitPanel
            tone="accent"
            eyebrow="Fri frakt"
            title={`Fri frakt på beställningar över ${formatPrice(site.freeShippingThreshold)}`}
            image={getDefaultVariant(spotlight).images[1]}
          >
            <p>
              Beställ före kl. {site.shippingCutoffHour} på vardagar så skickar vi samma dag. {site.returnDays} dagars
              öppet köp på allt.
            </p>
            <Button href="/kollektion" variant="inverse">
              Handla nu
            </Button>
          </SplitPanel>
        </div>
      )}
    </>
  );
}
