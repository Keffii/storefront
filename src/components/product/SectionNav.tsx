"use client";

import { useEffect, useRef, useState } from "react";
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
  const listRef = useRef<HTMLUListElement>(null);

  // On narrow screens the links scroll sideways: keep the active one in view.
  useEffect(() => {
    const list = listRef.current;
    const link = active ? list?.querySelector<HTMLElement>(`a[href="#${active}"]`) : null;
    if (!list || !link) return;
    const left = link.offsetLeft - list.offsetLeft;
    if (left < list.scrollLeft || left + link.offsetWidth > list.scrollLeft + list.clientWidth) {
      list.scrollTo({ left: Math.max(0, left - 16), behavior: "smooth" });
    }
  }, [active]);

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
        <ul role="list" className={styles.list} ref={listRef}>
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
