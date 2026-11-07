"use client";

import { useId, useState } from "react";
import type { OptionDefinition } from "@/lib/types";
import styles from "./OptionPicker.module.css";

interface OptionPickerProps {
  option: OptionDefinition;
  /** Controlled value. Omit (and pass defaultValue) to let the picker hold its own state. */
  value?: string;
  defaultValue?: string;
  onChange?: (valueId: string) => void;
  /** Values that are sold out in the current combination. Still selectable, but marked. */
  soldOut?: ReadonlySet<string>;
}

/**
 * A radio group: colour options render as swatches, everything else as
 * pills. Native radios give arrow-key navigation and screen-reader state.
 */
export function OptionPicker({ option, value, defaultValue, onChange, soldOut }: OptionPickerProps) {
  const name = useId();
  const [internal, setInternal] = useState(defaultValue ?? option.values[0]?.id);
  const selected = value ?? internal;
  const selectedLabel = option.values.find((v) => v.id === selected)?.label;
  const isSwatch = option.values.every((v) => v.swatch);

  function select(id: string) {
    setInternal(id);
    onChange?.(id);
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>
        <span className="caption">{option.label}</span>
        {selectedLabel && <span className={styles.current}>{selectedLabel}</span>}
      </legend>
      <div className={isSwatch ? styles.swatches : styles.pills}>
        {option.values.map((v) => {
          const out = soldOut?.has(v.id) ?? false;
          return (
            <label
              key={v.id}
              className={`${isSwatch ? styles.swatch : styles.pill} ${out ? styles.soldOut : ""}`}
              title={isSwatch ? v.label : undefined}
            >
              <input
                type="radio"
                className={styles.input}
                name={name}
                value={v.id}
                checked={selected === v.id}
                onChange={() => select(v.id)}
              />
              {isSwatch ? (
                <>
                  <span className={styles.dot} style={{ background: v.swatch }} aria-hidden="true" />
                  <span className="visually-hidden">
                    {v.label}
                    {out && " – slutsåld"}
                  </span>
                </>
              ) : (
                <span>
                  {v.label}
                  {out && <span className="visually-hidden"> – slutsåld</span>}
                </span>
              )}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
