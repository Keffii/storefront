"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { useToast } from "@/components/ui/Toast";

export function InteractiveDemo() {
  const [open, setOpen] = useState(false);
  const toast = useToast();

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)" }}>
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
