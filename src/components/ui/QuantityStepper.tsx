"use client";

import styles from "./QuantityStepper.module.css";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max: number;
  label: string;
  size?: "sm" | "md";
}

export function QuantityStepper({ value, onChange, min = 1, max, label, size = "md" }: QuantityStepperProps) {
  return (
    <div className={`${styles.stepper} ${styles[size]}`} role="group" aria-label={label}>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Minska antal"
      >
        −
      </button>
      <output className={styles.value} aria-live="polite" aria-label={`Antal: ${value}`}>
        {value}
      </output>
      <button
        type="button"
        className={styles.button}
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        aria-label="Öka antal"
      >
        +
      </button>
    </div>
  );
}
