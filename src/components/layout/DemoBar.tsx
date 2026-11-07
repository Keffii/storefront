import styles from "./DemoBar.module.css";

/** Shown on every page so nobody mistakes the demo for a real shop. */
export function DemoBar() {
  return (
    <div className={styles.bar} role="note">
      Portfolio demo: inga riktiga produkter eller betalningar
    </div>
  );
}
