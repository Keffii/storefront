"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useCatalog } from "@/components/inventory/InventoryProvider";
import { categories } from "@/data/products";
import { formatPrice } from "@/lib/format";
import { SEARCH_SUGGESTIONS, searchProducts } from "@/lib/search";
import styles from "./SearchDialog.module.css";

const MAX_RESULTS = 6;

/**
 * Header search. The trigger is a link to /sok, so it works without
 * JavaScript; with it, a modal dialog shows results as you type. The input is
 * an ARIA combobox: arrow keys move through the results, Enter opens one (or
 * the full results page), Escape closes.
 */
export function SearchDialog() {
  const products = useCatalog();
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const listId = useId();
  const titleId = useId();

  const results = useMemo(() => searchProducts(products, query, MAX_RESULTS + 1), [products, query]);
  const shown = results.slice(0, MAX_RESULTS);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      input.current?.focus();
    }
    if (!open && d.open) d.close();
  }, [open]);

  // "/" opens search from anywhere, as on many shops, unless the visitor is typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !t.closest("input, textarea, select, [contenteditable]")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const go = (href: string) => {
    close();
    router.push(href);
  };

  const resultsHref = `/sok?q=${encodeURIComponent(query.trim())}`;

  return (
    <>
      <a
        href="/sok"
        className={styles.trigger}
        aria-label="Sök"
        title="Sök (/)"
        onClick={(e) => {
          e.preventDefault();
          setOpen(true);
        }}
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      </a>

      <dialog
        ref={dialog}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClose={close}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className={styles.panel}>
          <h2 id={titleId} className="visually-hidden">
            Sök produkter
          </h2>
          <form
            role="search"
            action="/sok"
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              if (active >= 0 && shown[active]) go(`/produkter/${shown[active].slug}`);
              else if (query.trim()) go(resultsHref);
            }}
          >
            <svg className={styles.icon} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M15.5 15.5L21 21" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <input
              ref={input}
              name="q"
              type="search"
              role="combobox"
              aria-label="Sök produkter"
              aria-expanded={shown.length > 0}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
              placeholder="Sök efter produkt, färg eller material"
              autoComplete="off"
              enterKeyHint="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(-1);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((a) => Math.min(a + 1, shown.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((a) => Math.max(a - 1, -1));
                }
              }}
              className={styles.input}
            />
            <button type="button" className={styles.close} onClick={close}>
              Stäng
            </button>
          </form>

          <div className={styles.body}>
            {query.trim() === "" ? (
              <div className={styles.suggestions}>
                <p className="caption">Förslag</p>
                <ul role="list" className={styles.chips}>
                  {SEARCH_SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button type="button" className={styles.chip} onClick={() => setQuery(s)}>
                        {s}
                      </button>
                    </li>
                  ))}
                  {categories.map((c) => (
                    <li key={c.id}>
                      <Link href={`/kollektion/${c.id}`} className={styles.chip} onClick={close}>
                        {c.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <>
                <p className={styles.status} role="status">
                  {results.length === 0
                    ? `Inga träffar på ”${query.trim()}”`
                    : `${results.length > MAX_RESULTS ? `Fler än ${MAX_RESULTS}` : results.length} ${results.length === 1 ? "träff" : "träffar"}`}
                </p>
                <ul id={listId} role="listbox" aria-label="Sökresultat" className={styles.results}>
                  {shown.map((p, i) => {
                    const v = p.variants.find((x) => x.id === p.defaultVariantId) ?? p.variants[0];
                    return (
                      <li
                        key={p.slug}
                        id={`${listId}-${i}`}
                        role="option"
                        aria-selected={i === active}
                        className={`${styles.result} ${i === active ? styles.active : ""}`}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(`/produkter/${p.slug}`)}
                      >
                        <Image src={v.images[0].src} alt="" width={56} height={56} sizes="56px" className={styles.thumb} />
                        <span className={styles.resultText}>
                          <span className={styles.name}>{p.name}</span>
                          <span className={styles.tagline}>{p.tagline}</span>
                        </span>
                        <span className={styles.price}>{formatPrice(Math.min(...p.variants.map((x) => x.price)))}</span>
                      </li>
                    );
                  })}
                </ul>
                {results.length > 0 && (
                  <Link href={resultsHref} className={styles.all} onClick={close}>
                    Visa alla resultat
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
