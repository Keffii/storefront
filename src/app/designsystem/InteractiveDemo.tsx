"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { QuantityStepper } from "@/components/ui/QuantityStepper";
import { useToast } from "@/components/ui/Toast";

export function InteractiveDemo() {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const toast = useToast();

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-3)" }}>
      <QuantityStepper value={qty} onChange={setQty} max={5} label="Antal (exempel)" />
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Öppna låda
      </Button>
      <Button variant="secondary" onClick={() => toast.show("Tillagd i varukorgen", "success")}>
        Visa notis
      </Button>
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title="Exempellåda"
        footer={
          <Button fullWidth onClick={() => setOpen(false)}>
            Stäng
          </Button>
        }
      >
        <p>Lådan bygger på ett inbyggt &lt;dialog&gt;-element: fokus stannar i lådan och Esc stänger den.</p>
      </Drawer>
    </div>
  );
}
