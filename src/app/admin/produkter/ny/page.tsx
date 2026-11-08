import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { emptyDraft } from "@/lib/catalog-admin";
import { getAdminState } from "@/lib/server/auth";
import { getAllProducts } from "@/lib/server/catalog";
import { isImageStorageConfigured } from "@/lib/server/config";
import styles from "../../admin.module.css";

export const metadata: Metadata = { title: "Ny produkt", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const state = await getAdminState();
  if (state.kind !== "admin") redirect("/admin");
  const products = await getAllProducts();

  return (
    <div className={`container ${styles.page}`}>
      <Link href="/admin/produkter" className={styles.back}>
        ← Produkter
      </Link>
      <header className={styles.head}>
        <div>
          <p className="caption">Admin</p>
          <h1 className={styles.title}>Ny produkt</h1>
        </div>
      </header>
      <p className={styles.note}>
        Nya produkter sparas som dolda. Kryssa i &quot;Publicerad&quot; när bilder, priser och texter är klara.
      </p>
      <ProductEditor
        initial={emptyDraft()}
        isNew
        otherProducts={products.map((p) => ({ slug: p.slug, name: p.name }))}
        imageStorage={isImageStorageConfigured()}
      />
    </div>
  );
}
