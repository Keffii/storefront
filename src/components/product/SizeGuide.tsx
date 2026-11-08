"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import { SpecRows } from "@/components/ui/SpecRows";
import type { Product } from "@/lib/types";
import { ComparisonTable } from "./ComparisonTable";
import styles from "./SizeGuide.module.css";

/** Care advice by material, matched against the product's material spec. */
const CARE: { match: RegExp; title: string; text: string }[] = [
  { match: /ek|ask|trä/i, title: "Trä", text: "Torka av med en lätt fuktad trasa och torka efter. Olja ytan med möbelolja en gång om året, eller när träet känns torrt. Ställ inte varma kärl direkt på ytan." },
  { match: /stengods|keramik|terrakotta/i, title: "Stengods och keramik", text: "Glaserade ytor tål diskmaskin om inget annat står. Undvik snabba temperaturskiften, till exempel från kylskåp till het ugn." },
  { match: /glas/i, title: "Glas", text: "Munblåst glas diskas för hand i ljummet vatten. Härdat glas tål diskmaskin. Torka med en luddfri handduk så slipper du kalkfläckar." },
  { match: /stål|aluminium|metall/i, title: "Metall", text: "Torka av med en torr eller lätt fuktad trasa. Använd inga slipande rengöringsmedel, de repar lacken." },
  { match: /linne|textil|bomull/i, title: "Textil", text: "Tvätta i 40 grader med liknande färger. Låt lufttorka för att behålla formen." },
];

/**
 * "Mått och skötsel": the product's measurements, a size comparison when the
 * product has sizes, and care advice for its material, in a drawer next to
 * the options so the visitor doesn't lose their place.
 */
export function SizeGuide({ product }: { product: Product }) {
  const [open, setOpen] = useState(false);
  const material = product.specs.find((s) => s.label === "Material")?.value ?? "";
  const care = CARE.filter((c) => c.match.test(material));
  const measures = product.specs.filter((s) => /mått|höjd|bredd|djup|diameter|längd|volym|storlek/i.test(s.label));

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="2.5" y="8" width="19" height="8" rx="1" stroke="currentColor" strokeWidth="1.3" />
          <path d="M6.5 8v3M10.5 8v4.5M14.5 8v3M18.5 8v4.5" stroke="currentColor" strokeWidth="1.3" />
        </svg>
        Mått och skötsel
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Mått och skötsel">
        <div className={styles.body}>
          <section className={styles.section}>
            <h3 className={styles.h3}>Mått</h3>
            <SpecRows specs={measures.length ? measures : product.specs} />
            {product.comparison && (
              <ComparisonTable comparison={product.comparison} caption={`Storlekar för ${product.name}`} />
            )}
            <p className={styles.tip}>
              Tips: mät upp platsen hemma och markera måtten med maskeringstejp innan du beställer.
            </p>
          </section>
          <section className={styles.section}>
            <h3 className={styles.h3}>Skötsel</h3>
            {care.length > 0 ? (
              care.map((c) => (
                <div key={c.title} className={styles.care}>
                  <p className={styles.careTitle}>{c.title}</p>
                  <p>{c.text}</p>
                </div>
              ))
            ) : (
              <p>Torka av med en torr eller lätt fuktad trasa.</p>
            )}
          </section>
        </div>
      </Drawer>
    </>
  );
}
