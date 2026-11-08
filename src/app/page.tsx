import { Button } from "@/components/ui/Button";
import { CategoryGrid } from "@/components/patterns/CategoryGrid";
import { Hero } from "@/components/patterns/Hero";
import { ProductGrid } from "@/components/patterns/ProductGrid";
import { SplitPanel } from "@/components/patterns/SplitPanel";
import { categories, getDefaultVariant, site } from "@/data/products";
import { formatPrice } from "@/lib/format";
import { getCatalogWithStock } from "@/lib/server/catalog";
import { getRatingSummaries } from "@/lib/server/reviews";
import { jsonLdScript, storeJsonLd } from "@/lib/structured-data";
import styles from "./home.module.css";

export const revalidate = 600;

export default async function HomePage() {
  const catalog = await getCatalogWithStock();
  const featured = catalog.filter((p) => p.featured);
  const ratings = await getRatingSummaries(featured.map((p) => p.slug));
  const spotlight = catalog.find((p) => p.slug === "halo-bordslampa") ?? catalog[0];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(storeJsonLd())} />
      <Hero
        eyebrow="Nytt i belysning"
        title="Ljus som inte bländar"
        body="Halo har en kupad skärm som döljer glödlampan och dimras i tre steg."
        image={{ src: "/images/hero.svg", alt: "En tänd bordslampa på en skänk i ett mörkt rum" }}
        actions={
          <>
            <Button href="/produkter/halo-bordslampa" variant="inverse" size="lg">
              Se lampan
            </Button>
          </>
        }
      />

      <ul role="list" className={`container ${styles.promises}`} aria-label="Köpvillkor">
        <li>
          <strong>Fri frakt över {formatPrice(site.freeShippingThreshold)}</strong>
          <span>Annars {formatPrice(site.shippingFee)}</span>
        </li>
        <li>
          <strong>
            Leverans på {site.deliveryDays.min}–{site.deliveryDays.max} vardagar
          </strong>
          <span>Skickas samma dag vid order före kl. {site.shippingCutoffHour}</span>
        </li>
        <li>
          <strong>{site.returnDays} dagars öppet köp</strong>
          <span>Och {site.warrantyYears} års garanti</span>
        </li>
      </ul>

      <section className={`container ${styles.section}`} aria-labelledby="featured-heading">
        <div className={styles.sectionHead}>
          <h2 id="featured-heading" className={styles.heading}>
            Utvalda föremål
          </h2>
          <Button href="/kollektion" variant="ghost">
            Visa alla
          </Button>
        </div>
        <ProductGrid products={featured} ratings={ratings} />
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
      <section className={`container ${styles.section} ${styles.about}`} aria-labelledby="about-heading">
        <p className="caption">Om {site.brandName}</p>
        <h2 id="about-heading" className={styles.aboutTitle}>
          Få föremål, gjorda för att användas länge.
        </h2>
        <div className={styles.aboutBody}>
          <p>
            Vi säljer ett litet sortiment av lampor, vaser och möbler i material som går att laga och sköta: stål,
            massivt trä, stengods och glas. Varje produktsida visar mått, material och skötsel så att du kan bestämma
            dig utan att gissa.
          </p>
          <p>
            Recensionerna kommer från kunder och redigeras inte. Priserna är desamma hela året, och de enda
            rabatterna är paketpriserna när du köper tillbehör till en produkt.
          </p>
        </div>
      </section>
    </>
  );
}
