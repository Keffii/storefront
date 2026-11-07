"use client";

import { useEffect, useState } from "react";
import styles from "./SectionNav.module.css";

export interface SectionLink {
  id: string;
  label: string;
}

/**
 * Section links that stick below the header and highlight the section in
 * view. Plain anchor links, so they work without JavaScript too.
 */
export function SectionNav({ sections }: { sections: SectionLink[] }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.boundingClientRect.top);
          else visible.delete(e.target.id);
        }
        // The topmost visible section wins.
        const first = sections.find((s) => visible.has(s.id));
        setActive(first?.id ?? null);
      },
      { rootMargin: "-120px 0px -55% 0px" },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <nav className={styles.nav} aria-label="Avsnitt på sidan">
      <div className="container">
        <ul role="list" className={styles.list}>
          {sections.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className={styles.link} aria-current={active === s.id ? "location" : undefined}>
                {s.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
