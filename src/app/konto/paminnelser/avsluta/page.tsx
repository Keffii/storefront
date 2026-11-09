import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import { isDbConfigured } from "@/lib/server/config";
import { turnOffCartReminders } from "@/lib/server/saved-carts";

export const metadata: Metadata = { title: "Påminnelser", robots: { index: false } };
export const dynamic = "force-dynamic";

/** One click from the reminder email, no sign-in needed. */
export default async function TurnOffRemindersPage({ searchParams }: { searchParams: Promise<{ u?: string; t?: string }> }) {
  const { u, t } = await searchParams;
  const ok = Boolean(u && t && isDbConfigured() && (await turnOffCartReminders(u, t)));
  return (
    <div className="container" style={{ display: "grid", gap: "var(--space-4)", maxWidth: 560, paddingTop: "var(--space-8)" }}>
      <p className="caption">Påminnelser</p>
      <h1 style={{ fontSize: "var(--text-3xl)" }}>{ok ? "Påminnelserna är avstängda" : "Länken fungerar inte"}</h1>
      <p style={{ color: "var(--text-secondary)" }}>
        {ok
          ? "Vi mejlar inte längre om varor i varukorgen, och den sparade varukorgen är borttagen. Du kan slå på det igen under Mina uppgifter."
          : "Länken är ofullständig. Du kan stänga av påminnelser under Mitt konto, Mina uppgifter."}
      </p>
      <div>
        <Button href="/konto/uppgifter" variant="secondary">
          Mina uppgifter
        </Button>
      </div>
    </div>
  );
}
