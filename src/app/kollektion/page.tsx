import type { Metadata } from "next";
import { CollectionPage } from "./CollectionPage";

export const revalidate = 600;

export const metadata: Metadata = {
  title: "Alla produkter",
  description: "Alla föremål från Objekt: belysning, vaser, möbler och bordsartiklar.",
  alternates: { canonical: "/kollektion" },
};

export default function AllProductsPage() {
  return <CollectionPage category={null} />;
}
