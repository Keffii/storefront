"use client";

import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { Button } from "@/components/ui/Button";
import type { CartLine } from "@/lib/cart";

/** Puts the order's still-available lines back in the cart. */
export function ReorderButton({ lines, unavailable }: { lines: CartLine[]; unavailable: string[] }) {
  const { add } = useCart();
  const [note, setNote] = useState<string | null>(null);

  if (lines.length === 0) {
    return <p role="status">Inga av varorna finns i lager just nu.</p>;
  }

  return (
    <>
      <Button
        variant="secondary"
        onClick={() => {
          add(lines);
          setNote(unavailable.length ? `Slutsålt just nu och inte tillagt: ${unavailable.join(", ")}.` : null);
        }}
      >
        Köp igen
      </Button>
      {note && <p role="status">{note}</p>}
    </>
  );
}
