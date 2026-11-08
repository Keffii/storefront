import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { isDbConfigured } from "@/lib/server/config";
import { confirmNewsletter } from "@/lib/server/newsletter";

export const metadata: Metadata = { title: "Nyhetsbrev", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function ConfirmNewsletterPage({ searchParams }: { searchParams: Promise<{ e?: string; t?: string }> }) {
  const { e, t } = await searchParams;
  const ok = Boolean(e && t && isDbConfigured() && (await confirmNewsletter(e, t)));
  return (
    <div className="container" style={{ display: "grid", gap: "var(--space-4)", maxWidth: 560, paddingTop: "var(--space-8)" }}>
      <p className="caption">Nyhetsbrev</p>
      <h1 style={{ fontSize: "var(--text-3xl)" }}>{ok ? "Du prenumererar nu" : "Länken fungerar inte"}</h1>
      <p style={{ color: "var(--text-secondary)" }}>
        {ok
          ? "Tack! Vi skickar nyhetsbrevet högst en gång i månaden. Varje mejl har en länk för att avsluta."
          : "Länken har gått ut eller är ofullständig. Anmäl dig igen längst ner på sidan, så skickar vi en ny."}
      </p>
      <div>
        <Button href="/kollektion" variant="secondary">
          Till butiken
        </Button>
      </div>
    </div>
  );
}
