import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { categories, getCategory } from "@/data/products";
import type { CategoryId } from "@/lib/types";
import { CollectionPage } from "../CollectionPage";

export const revalidate = 600;
// No `dynamicParams = false`: with it, Next.js 15 throws NoFallbackError and
// serves a 404 when a paid order revalidates the stock tag. Unknown
// categories still get a 404 from notFound() below.

export function generateStaticParams() {
  return categories.map((c) => ({ kategori: c.id }));
}

type Params = Promise<{ kategori: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const category = getCategory((await params).kategori as CategoryId);
  if (!category) return {};
  return {
    title: category.name,
    description: `${category.name}: ${category.description.toLowerCase()} från Objekt.`,
    alternates: { canonical: `/kollektion/${category.id}` },
  };
}

export default async function CategoryPage({ params }: { params: Params }) {
  const category = getCategory((await params).kategori as CategoryId);
  if (!category) notFound();
  return <CollectionPage category={category} />;
}
