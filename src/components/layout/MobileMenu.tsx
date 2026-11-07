"use client";

import Link from "next/link";
import { useState } from "react";
import { Drawer } from "@/components/ui/Drawer";
import styles from "./MobileMenu.module.css";

export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-label="Meny"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 7h18M3 12h18M3 17h18" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="Meny" side="left">
        <nav aria-label="Mobilmeny">
          <ul role="list" className={styles.list}>
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={styles.link} onClick={() => setOpen(false)}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </Drawer>
    </>
  );
}
