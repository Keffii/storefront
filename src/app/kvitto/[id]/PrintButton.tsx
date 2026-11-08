"use client";

import { Button } from "@/components/ui/Button";

/** The browser's print dialog also offers "Spara som PDF". */
export function PrintButton() {
  return (
    <div className="no-print" style={{ marginTop: "var(--space-5)" }}>
      <Button variant="secondary" onClick={() => window.print()}>
        Skriv ut eller spara som PDF
      </Button>
    </div>
  );
}
