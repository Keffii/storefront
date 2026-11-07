import { formatRating, type RatingSummary, type Review } from "@/lib/reviews";
import { ReviewForm } from "./ReviewForm";
import { Stars } from "./Stars";
import styles from "./ReviewsSection.module.css";

const dateFormat = new Intl.DateTimeFormat("sv-SE", { day: "numeric", month: "long", year: "numeric" });

export function ReviewsSection({
  slug,
  productName,
  reviews,
  summary,
  enabled,
}: {
  slug: string;
  productName: string;
  reviews: Review[];
  summary: RatingSummary;
  enabled: boolean;
}) {
  return (
    <div className={styles.layout}>
      <div className={styles.side}>
        {summary.count > 0 ? (
          <div className={styles.summary}>
            <p className={styles.average}>{formatRating(summary.average)}</p>
            <Stars value={summary.average} size={18} />
            <p className={styles.count}>
              Baserat på {summary.count} {summary.count === 1 ? "recension" : "recensioner"}
            </p>
          </div>
        ) : (
          <p className={styles.none}>
            Ingen har recenserat {productName} än.{enabled && " Skriv den första recensionen."}
          </p>
        )}
        <p className={styles.policy}>
          Recensionerna skrivs av besökare och publiceras som de är. Vi tar bara bort spam och personuppgifter.
        </p>
        {enabled ? (
          <ReviewForm slug={slug} productName={productName} />
        ) : (
          <p className={styles.policy}>Recensioner går inte att skicka in just nu.</p>
        )}
      </div>

      {reviews.length > 0 && (
        <ol role="list" className={styles.list}>
          {reviews.map((r) => (
            <li key={r.id} className={styles.review}>
              <article>
                <header className={styles.reviewHead}>
                  <Stars value={r.rating} label={`${r.rating} av 5 stjärnor`} />
                  {r.title && <h3 className={styles.title}>{r.title}</h3>}
                </header>
                <p className={styles.body}>{r.body}</p>
                <footer className={styles.meta}>
                  {r.name} · <time dateTime={r.createdAt}>{dateFormat.format(new Date(r.createdAt))}</time>
                </footer>
              </article>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
