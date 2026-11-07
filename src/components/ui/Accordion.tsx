import type { ReactNode } from "react";
import styles from "./Accordion.module.css";

export interface AccordionItem {
  id: string;
  title: ReactNode;
  content: ReactNode;
}

/**
 * Built on native <details>/<summary>: keyboard support, screen-reader state
 * and find-in-page all work without JavaScript.
 */
export function Accordion({ items, defaultOpen }: { items: AccordionItem[]; defaultOpen?: string }) {
  return (
    <div className={styles.accordion}>
      {items.map((item) => (
        <details key={item.id} className={styles.item} open={item.id === defaultOpen}>
          <summary className={styles.summary}>
            <span>{item.title}</span>
            <span className={styles.icon} aria-hidden="true" />
          </summary>
          <div className={styles.content}>{item.content}</div>
        </details>
      ))}
    </div>
  );
}
