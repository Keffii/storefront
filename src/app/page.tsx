import { Button } from "@/components/ui/Button";
import { CategoryGrid } from "@/components/patterns/CategoryGrid";
import { Hero } from "@/components/patterns/Hero";
import { ProductGrid } from "@/components/patterns/ProductGrid";
import Link from "next/link";
import { categories, sets, site } from "@/data/products";
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
  const frukost = sets.find((s) => s.id === "frukost");

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
            <Button href="/kollektion" variant="inverse" size="lg" className={styles.heroSecondary}>
              Alla produkter
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
        <li>
          <strong>Kort eller Klarna</strong>
          <span>Betala direkt, om 30 dagar eller dela upp</span>
        </li>
      </ul>

      <section className={`container ${styles.section} ${styles.first}`} aria-labelledby="featured-heading">
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

      <section className={`container ${styles.section} ${styles.promos}`} aria-label="Erbjudanden">
        <Link href="/produkter/mugg" className={styles.promo}>
          <span className="caption">Setpris</span>
          <span className={styles.promoTitle}>Frukostset för {formatPrice(frukost?.price ?? 49900)}</span>
          <span className={styles.promoText}>Mugg, assiett och två skålar i samma glasyr. Köpta var för sig kostar de mer.</span>
          <span className={styles.promoLink}>Se setet</span>
        </Link>
        <Link href="/presentkort" className={`${styles.promo} ${styles.promoAccent}`}>
          <span className="caption">Presentkort</span>
          <span className={styles.promoTitle}>Ge bort något de väljer själva</span>
          <span className={styles.promoText}>Skickas med e-post direkt, gäller i två år och kan användas i flera köp.</span>
          <span className={styles.promoLink}>Köp presentkort</span>
        </Link>
      </section>

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
            Recensionerna kommer från kunder och redigeras inte. Priserna är desamma hela året. Rabatterna är
            paketpriser på tillbehör, setpriser och en välkomstkod som står öppet på sidan om projektet.
          </p>
        </div>
      </section>
    </>
  );
}
