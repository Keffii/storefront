"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Accordion } from "@/components/ui/Accordion";
import { fold } from "@/lib/search";
import styles from "./kundservice.module.css";

export interface SearchableFaq {
  question: string;
  answer: string;
  topic: string;
  href?: string;
}

const START_COUNT = 8;

/** Filters the questions as you type; every word must appear in the question, answer or topic. */
export function FaqSearch({ items }: { items: SearchableFaq[] }) {
  const [query, setQuery] = useState("");
  const terms = fold(query).split(" ").filter(Boolean);
  const matches = useMemo(
    () => (terms.length === 0 ? items.slice(0, START_COUNT) : items.filter((f) => terms.every((t) => fold(`${f.question} ${f.answer} ${f.topic}`).includes(t)))),
    [items, terms.join(" ")], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <div className={styles.faq}>
      <label htmlFor="faq-search" className="visually-hidden">
        Sök bland frågorna
      </label>
      <input
        id="faq-search"
        type="search"
        placeholder="Sök, till exempel retur, frakt eller presentkort"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={styles.search}
      />
      <p className={styles.count} role="status">
        {terms.length === 0
          ? `Vanligaste frågorna. Sök för att se alla ${items.length}.`
          : matches.length === 0
            ? "Inga frågor matchar. Skriv till oss i formuläret nedan."
            : `${matches.length} ${matches.length === 1 ? "fråga" : "frågor"}`}
      </p>
      {matches.length > 0 && (
        <Accordion
          items={matches.map((f, i) => ({
            id: `kfaq-${i}-${f.question.length}`,
            title: f.question,
            content: (
              <>
                <p>{f.answer}</p>
                {f.href && (
                  <p className={styles.faqLink}>
                    <Link href={f.href}>{f.topic}</Link>
                  </p>
                )}
              </>
            ),
          }))}
        />
      )}
    </div>
  );
}
