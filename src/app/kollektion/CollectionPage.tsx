import Link from "next/link";
import { CollectionView } from "@/components/collection/CollectionView";
import { getCatalog } from "@/lib/server/catalog";
import { getRatingSummaries } from "@/lib/server/reviews";
import { breadcrumbJsonLd, categoryBreadcrumb, jsonLdScript } from "@/lib/structured-data";
import type { Category } from "@/lib/types";
import styles from "./kollektion.module.css";

/** Shared by /kollektion and /kollektion/[kategori]. Statically generated. */
export async function CollectionPage({ category }: { category: Category | null }) {
  const ratings = await getRatingSummaries((await getCatalog()).map((p) => p.slug));
  const crumbs = [
    { name: "Startsida", path: "/" },
    { name: "Alla produkter", path: "/kollektion" },
    ...(category ? [categoryBreadcrumb(category)] : []),
  ];

  return (
    <div className="container">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(breadcrumbJsonLd(crumbs))} />
      <header className={styles.header}>
        <nav aria-label="Brödsmulor" className={styles.breadcrumbs}>
          <ol role="list">
            <li>
              <Link href="/">Startsida</Link>
            </li>
            {category ? (
              <>
                <li>
                  <Link href="/kollektion">Alla produkter</Link>
                </li>
                <li aria-current="page">{category.name}</li>
              </>
            ) : (
              <li aria-current="page">Alla produkter</li>
            )}
          </ol>
        </nav>
        <h1 className={styles.title}>{category?.name ?? "Alla produkter"}</h1>
        {category && <p className={styles.lead}>{category.description}</p>}
      </header>

      {/* Static HTML holds the unfiltered list; query filters apply after hydration. */}
      <CollectionView category={category?.id ?? null} ratings={ratings} />
    </div>
  );
}
