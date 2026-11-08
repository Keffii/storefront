import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ProductEditor } from "@/components/admin/ProductEditor";
import { toDraft } from "@/lib/catalog-admin";
import { getAdminState } from "@/lib/server/auth";
import { getAllProducts } from "@/lib/server/catalog";
import { isImageStorageConfigured } from "@/lib/server/config";
import styles from "../../admin.module.css";

export const metadata: Metadata = { title: "Redigera produkt", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const state = await getAdminState();
  if (state.kind !== "admin") redirect("/admin");
  const { slug } = await params;
  const products = await getAllProducts();
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

  return (
    <div className={`container ${styles.page}`}>
      <Link href="/admin/produkter" className={styles.back}>
        ← Produkter
      </Link>
      <header className={styles.head}>
        <div>
          <p className="caption">Admin</p>
          <h1 className={styles.title}>{product.name}</h1>
        </div>
      </header>
      <ProductEditor
        initial={toDraft(product)}
        isNew={false}
        otherProducts={products.filter((p) => p.slug !== slug).map((p) => ({ slug: p.slug, name: p.name }))}
        imageStorage={isImageStorageConfigured()}
      />
    </div>
  );
}
