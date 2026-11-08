import type { Metadata } from "next";
import { GIFT_CARD_VALID_MONTHS } from "@/lib/gift-cards";
import { GiftCardForm } from "./GiftCardForm";
import styles from "./presentkort.module.css";

export const metadata: Metadata = {
  title: "Presentkort",
  description: "Ett digitalt presentkort som skickas direkt med e-post och kan användas i flera köp.",
  alternates: { canonical: "/presentkort" },
};

export default function GiftCardPage() {
  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.intro}>
        <p className="caption">Presentkort</p>
        <h1 className={styles.title}>Ge bort ett presentkort</h1>
        <p className={styles.lead}>
          Presentkortet skickas med e-post direkt efter betalningen, till dig eller till mottagaren. Det gäller i{" "}
          {GIFT_CARD_VALID_MONTHS / 12} år och saldot kan användas i flera köp.
        </p>
      </div>
      <GiftCardForm />
    </div>
  );
}
