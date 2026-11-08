import type { Metadata } from "next";
import Link from "next/link";
import { products, sharedFaq } from "@/data/products";
import { serviceFaq, serviceHours } from "@/data/service";
import { ContactForm } from "./ContactForm";
import { FaqSearch, type SearchableFaq } from "./FaqSearch";
import styles from "./kundservice.module.css";

export const metadata: Metadata = {
  title: "Kundservice",
  description: "Svar på vanliga frågor om order, frakt, returer och betalning, och ett formulär för att kontakta oss.",
  alternates: { canonical: "/kundservice" },
};

/** Service questions, the shared shop questions and every product's own questions, without duplicates. */
function allFaq(): SearchableFaq[] {
  const seen = new Set<string>();
  const out: SearchableFaq[] = [];
  const add = (f: SearchableFaq) => {
    const key = `${f.question}|${f.answer}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(f);
  };
  serviceFaq.forEach((f) => add({ question: f.question, answer: f.answer, topic: f.topic }));
  sharedFaq().forEach((f) => add({ ...f, topic: "Frakt och betalning" }));
  for (const p of products) for (const f of p.faq) add({ ...f, topic: p.name, href: `/produkter/${p.slug}` });
  return out;
}

export default function CustomerServicePage() {
  return (
    <div className={`container ${styles.page}`}>
      <header className={styles.header}>
        <p className="caption">Kundservice</p>
        <h1 className={styles.title}>Hur kan vi hjälpa dig?</h1>
        <p className={styles.lead}>
          Sök bland vanliga frågor, eller skriv till oss. Du kan också <Link href="/spara-order">spåra din order</Link> eller
          läsa om <Link href="/frakt-och-returer">frakt och returer</Link>.
        </p>
      </header>

      <section aria-labelledby="faq-title" className={styles.section}>
        <h2 id="faq-title" className={styles.h2}>
          Vanliga frågor
        </h2>
        <FaqSearch items={allFaq()} />
      </section>

      <section id="kontakt" aria-labelledby="contact-title" className={styles.contact}>
        <div className={styles.contactInfo}>
          <h2 id="contact-title" className={styles.h2}>
            Kontakta oss
          </h2>
          <dl className={styles.facts}>
            <div>
              <dt>Öppet</dt>
              <dd>{serviceHours.label}</dd>
            </div>
            <div>
              <dt>Svarstid</dt>
              <dd>{serviceHours.responseTime}</dd>
            </div>
          </dl>
          <p className={styles.note}>{serviceHours.note}</p>
        </div>
        <ContactForm />
      </section>
    </div>
  );
}
