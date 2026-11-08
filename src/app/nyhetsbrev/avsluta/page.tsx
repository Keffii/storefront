import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { isDbConfigured } from "@/lib/server/config";
import { unsubscribeNewsletter } from "@/lib/server/newsletter";

export const metadata: Metadata = { title: "Avsluta nyhetsbrev", robots: { index: false } };
export const dynamic = "force-dynamic";

/** One click, no sign-in, no "are you sure". */
export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ e?: string; t?: string }> }) {
  const { e, t } = await searchParams;
  const ok = Boolean(e && t && isDbConfigured() && (await unsubscribeNewsletter(e, t)));
  return (
    <div className="container" style={{ display: "grid", gap: "var(--space-4)", maxWidth: 560, paddingTop: "var(--space-8)" }}>
      <p className="caption">Nyhetsbrev</p>
      <h1 style={{ fontSize: "var(--text-3xl)" }}>{ok ? "Du får inga fler nyhetsbrev" : "Länken fungerar inte"}</h1>
      <p style={{ color: "var(--text-secondary)" }}>
        {ok
          ? "Prenumerationen är avslutad och e-postadressen borttagen från listan. Orderbekräftelser och kvitton skickas som vanligt när du handlar."
          : "Länken är ofullständig. Använd länken längst ner i ett nyhetsbrev, eller kontakta kundservice."}
      </p>
      <div>
        <Button href="/" variant="secondary">
          Till startsidan
        </Button>
      </div>
    </div>
  );
}
