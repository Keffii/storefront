import { Button } from "@/components/ui/Button";
import { CategoryGrid } from "@/components/patterns/CategoryGrid";
import { Hero } from "@/components/patterns/Hero";
import { ProductGrid } from "@/components/patterns/ProductGrid";
import Link from "next/link";
import hero from "@/data/hero.json";
import { categories, sets, site } from "@/data/products";
import { formatPrice } from "@/lib/format";
import { getCatalogWithStock } from "@/lib/server/catalog";
import { getRatingSummaries } from "@/lib/server/reviews";
import { jsonLdScript, storeJsonLd } from "@/lib/structured-data";
import styles from "./home.module.css";

export const revalidate = 600;

function SellingPoint({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <li>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d={icon} stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
      <strong>{title}</strong>
      <span>{children}</span>
    </li>
  );
}

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
        image={{ src: hero.src, alt: "En tänd Halo bordslampa på ett ekbord i ett mörkt rum" }}
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
        <SellingPoint icon="M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17 19.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" title={`Fri frakt över ${formatPrice(site.freeShippingThreshold)}`}>
          Annars {formatPrice(site.shippingFee)}
        </SellingPoint>
        <SellingPoint icon="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" title={`Leverans på ${site.deliveryDays.min}–${site.deliveryDays.max} vardagar`}>
          Skickas samma dag vid order före kl. {site.shippingCutoffHour}
        </SellingPoint>
        <SellingPoint icon="M4 12a8 8 0 1 0 2.3-5.6M4 4v4h4" title={`${site.returnDays} dagars öppet köp`}>
          Och {site.warrantyYears} års garanti
        </SellingPoint>
        <SellingPoint icon="M3 6h18v12H3zM3 10h18M7 15h4" title="Kort eller Klarna">
          Betala direkt, om 30 dagar eller dela upp
        </SellingPoint>
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
        <CategoryGrid
          categories={categories}
          counts={Object.fromEntries(categories.map((c) => [c.id, catalog.filter((p) => p.category === c.id).length]))}
        />
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
            Lampor, vaser, möbler och bordsartiklar i stål, massivt trä, stengods och glas. Varje produktsida visar mått,
            material och skötsel, recensionerna redigeras inte och priserna är desamma hela året.
          </p>
        </div>
      </section>
    </>
  );
}
