import type { Metadata } from "next";
import { TrackOrderForm } from "./TrackOrderForm";
import styles from "./spara.module.css";

export const metadata: Metadata = {
  title: "Spåra order",
  description: "Se status för din beställning med ordernummer och e-post.",
};

export default function TrackOrderPage() {
  return (
    <div className={`container ${styles.page}`}>
      <p className="caption">Kundservice</p>
      <h1 className={styles.title}>Spåra din order</h1>
      <p className={styles.lead}>
        Ange ordernumret från orderbekräftelsen (åtta tecken) och e-postadressen du handlade med. Har du ett konto ser du
        alla dina ordrar under Mitt konto.
      </p>
      <TrackOrderForm />
    </div>
  );
}
