import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminState } from "@/lib/server/auth";
import { RatingLine } from "@/components/reviews/RatingLine";
import { Stars } from "@/components/reviews/Stars";
import { Accordion } from "@/components/ui/Accordion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { OptionPicker } from "@/components/ui/OptionPicker";
import { Price } from "@/components/ui/Price";
import { Skeleton } from "@/components/ui/Skeleton";
import { SpecRows } from "@/components/ui/SpecRows";
import { getProduct } from "@/data/products";
import { InteractiveDemo } from "./InteractiveDemo";
import styles from "./designsystem.module.css";

export const metadata: Metadata = {
  title: "Designsystem",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

const palette = [
  ["Graphite", "--color-graphite", "Text, primärknappar"],
  ["Paper", "--color-paper", "Sidor, lådor"],
  ["Plinth Cream", "--color-plinth-cream", "Produktbakgrunder"],
  ["Tokyo Blue", "--color-tokyo-blue", "Accent, en gång per vy"],
  ["Linen Sand", "--color-linen-sand", "Valt läge"],
  ["Slate", "--color-slate", "Sekundär text"],
  ["Quiet Gray", "--color-quiet-gray", "Dämpad text"],
  ["Option Mist", "--color-option-mist", "Ramar, köpkort"],
  ["Hair Line", "--color-hair-line", "Tunna linjer"],
  ["Footer Black", "--color-footer-black", "Sidfot"],
] as const;

export default async function DesignSystemPage() {
  // Internal reference for the team: only admins see it on the live site.
  const state = await getAdminState();
  if (state.kind !== "admin" && state.kind !== "not-configured") redirect("/admin/logga-in");

  const lamp = getProduct("halo-bordslampa")!;
  const lowStock = new Set(["l"]);

  return (
    <div className={`container ${styles.page}`}>
      <header>
        <p className="caption">Objekt</p>
        <h1 className={styles.title}>Designsystem</h1>
        <p className={styles.lead}>Tokens och komponenter som resten av butiken byggs av.</p>
      </header>

      <section className={styles.section} aria-labelledby="ds-colors">
        <h2 id="ds-colors" className={styles.h2}>
          Färger
        </h2>
        <ul role="list" className={styles.palette}>
          {palette.map(([name, token, use]) => (
            <li key={token} className={styles.swatch}>
              <span className={styles.chip} style={{ background: `var(${token})` }} />
              <span className={styles.swatchName}>{name}</span>
              <code className={styles.token}>{token}</code>
              <span className={styles.use}>{use}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="ds-type">
        <h2 id="ds-type" className={styles.h2}>
          Typografi
        </h2>
        <div className={styles.stack}>
          <p style={{ fontSize: "var(--text-display)", fontWeight: 300, lineHeight: 1.05 }}>Display</p>
          <p style={{ fontSize: "var(--text-3xl)", fontWeight: 300, lineHeight: 1.1 }}>Rubrik 1: Hanken Grotesk 300</p>
          <p style={{ fontSize: "var(--text-2xl)", fontWeight: 300 }}>Rubrik 2</p>
          <p>Brödtext: Hanken Grotesk 400, 16 px, radavstånd 1,6.</p>
          <p className="caption">Bildtext: Jost 500, versaler, spärrad</p>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-buttons">
        <h2 id="ds-buttons" className={styles.h2}>
          Knappar
        </h2>
        <div className={styles.row}>
          <Button>Primär</Button>
          <Button variant="secondary">Sekundär</Button>
          <Button variant="ghost">Textknapp</Button>
          <Button size="lg">Stor</Button>
          <Button disabled>Inaktiv</Button>
        </div>
        <div className={`${styles.row} ${styles.dark}`}>
          <Button variant="inverse">Inverterad</Button>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-badges">
        <h2 id="ds-badges" className={styles.h2}>
          Märken och pris
        </h2>
        <div className={styles.row}>
          <Badge kind="new" />
          <Badge kind="bestseller" />
          <Badge kind="limited" />
          <Badge tone="success">I lager</Badge>
          <Badge tone="warning">Endast 3 kvar</Badge>
        </div>
        <div className={styles.row}>
          <Price amount={149500} size="lg" />
          <Price amount={149500} from />
          <Price amount={11900} before={14900} size="sm" />
        </div>
        <div className={styles.row}>
          <Stars value={4.5} size={16} />
          <RatingLine summary={{ count: 12, average: 4.3 }} />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-pickers">
        <h2 id="ds-pickers" className={styles.h2}>
          Väljare
        </h2>
        <div className={styles.stack}>
          <OptionPicker option={lamp.options[0]} defaultValue="krita" soldOut={new Set(["dimbla"])} />
          <OptionPicker option={lamp.options[1]} defaultValue="s" soldOut={lowStock} />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-specs">
        <h2 id="ds-specs" className={styles.h2}>
          Specifikationer och dragspel
        </h2>
        <div className={styles.twoCol}>
          <SpecRows specs={lamp.specs.slice(0, 4)} />
          <Accordion
            defaultOpen="a"
            items={lamp.faq.map((f, i) => ({ id: i === 0 ? "a" : `q${i}`, title: f.question, content: <p>{f.answer}</p> }))}
          />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-skeleton">
        <h2 id="ds-skeleton" className={styles.h2}>
          Skelett
        </h2>
        <div className={styles.skeletons}>
          {[0, 1, 2].map((i) => (
            <div key={i} className={styles.stack}>
              <Skeleton aspect="1" />
              <Skeleton width="70%" />
              <Skeleton width="30%" />
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="ds-overlays">
        <h2 id="ds-overlays" className={styles.h2}>
          Antal, låda och notiser
        </h2>
        <InteractiveDemo />
      </section>
    </div>
  );
}
