import type { Metadata } from "next";
import { Button } from "@/components/ui/Button";
import styles from "../presentkort.module.css";

export const metadata: Metadata = { title: "Tack för ditt köp", robots: { index: false } };

/** The card itself is issued by the Stripe webhook and arrives by email. */
export default function GiftCardThanksPage() {
  return (
    <div className={`container ${styles.page}`}>
      <div className={styles.intro}>
        <p className="caption">Presentkort</p>
        <h1 className={styles.title}>Tack för ditt köp</h1>
        <p className={styles.lead}>
          Presentkortet skickas med e-post inom någon minut. Hittar du det inte, titta i skräpposten. Med Klarna kan det
          dröja tills betalningen är godkänd.
        </p>
      </div>
      <div>
        <Button href="/kollektion" variant="secondary">
          Fortsätt handla
        </Button>
      </div>
    </div>
  );
}
