import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { confirmBackInStock } from "@/lib/server/back-in-stock";
import { isDbConfigured } from "@/lib/server/config";

export const metadata: Metadata = { title: "Bevakning", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ConfirmBackInStockPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; v?: string; e?: string; t?: string }>;
}) {
  const { p, v, e, t } = await searchParams;
  const label = p && v && e && t && isDbConfigured() ? await confirmBackInStock(p, v, e, t) : null;

  return (
    <div className="container" style={{ display: "grid", gap: "var(--space-4)", maxWidth: 560, paddingTop: "var(--space-8)" }}>
      <p className="caption">Bevakning</p>
      <h1 style={{ fontSize: "var(--text-3xl)" }}>{label ? "Bevakningen är bekräftad" : "Länken fungerar inte"}</h1>
      <p style={{ color: "var(--text-secondary)" }}>
        {label
          ? `Vi mejlar dig en gång när ${label} finns i lager igen. Sedan avslutas bevakningen automatiskt.`
          : "Länken har gått ut eller är ofullständig. Du kan starta en ny bevakning på produktsidan."}
      </p>
      <div>
        <Button href={p ? `/produkter/${p}` : "/kollektion"} variant="secondary">
          {p ? "Till produkten" : "Till butiken"}
        </Button>
      </div>
    </div>
  );
}
