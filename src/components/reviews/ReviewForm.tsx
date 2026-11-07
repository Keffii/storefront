"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { REVIEW_LIMITS, validateReview, type ReviewErrors } from "@/lib/reviews";
import styles from "./ReviewForm.module.css";

type Status = "closed" | "open" | "sending" | "sent";

export function ReviewForm({ slug, productName }: { slug: string; productName: string }) {
  const router = useRouter();
  const id = useId();
  const [status, setStatus] = useState<Status>("closed");
  const [rating, setRating] = useState(0);
  const [errors, setErrors] = useState<ReviewErrors>({});
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    const input = { ...data, rating };
    const check = validateReview(input);
    if (!check.ok) {
      setErrors(check.errors);
      const first = Object.keys(check.errors)[0];
      e.currentTarget.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setErrors({});
    setMessage(null);
    setStatus("sending");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...input, slug }),
      });
      const json = (await res.json().catch(() => ({}))) as { errors?: ReviewErrors; message?: string };
      if (res.ok) {
        setStatus("sent");
        router.refresh();
        return;
      }
      setErrors(json.errors ?? {});
      setMessage(json.message ?? null);
      setStatus("open");
    } catch {
      setMessage("Ingen anslutning. Försök igen.");
      setStatus("open");
    }
  }

  if (status === "closed") {
    return (
      <Button variant="secondary" onClick={() => setStatus("open")}>
        Skriv en recension
      </Button>
    );
  }

  if (status === "sent") {
    return (
      <p className={styles.thanks} role="status">
        Tack! Din recension av {productName} är publicerad.
      </p>
    );
  }

  const field = (name: keyof ReviewErrors) => ({
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": errors[name] ? `${id}-${name}-error` : undefined,
  });

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <fieldset className={styles.rating} aria-describedby={errors.rating ? `${id}-rating-error` : undefined}>
        <legend className="caption">Ditt betyg</legend>
        <div className={styles.starInputs}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className={`${styles.star} ${n <= rating ? styles.starOn : ""}`}>
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                className="visually-hidden"
              />
              <span aria-hidden="true">★</span>
              <span className="visually-hidden">
                {n} {n === 1 ? "stjärna" : "stjärnor"}
              </span>
            </label>
          ))}
        </div>
        {errors.rating && (
          <p id={`${id}-rating-error`} className={styles.error}>
            {errors.rating}
          </p>
        )}
      </fieldset>

      <label className={styles.field}>
        <span className="caption">Namn</span>
        <input name="name" autoComplete="given-name" maxLength={REVIEW_LIMITS.name.max} {...field("name")} />
        <span className={styles.hint}>Visas med recensionen. Förnamn räcker.</span>
        {errors.name && (
          <span id={`${id}-name-error`} className={styles.error}>
            {errors.name}
          </span>
        )}
      </label>

      <label className={styles.field}>
        <span className="caption">Rubrik (valfri)</span>
        <input name="title" maxLength={REVIEW_LIMITS.title.max} {...field("title")} />
        {errors.title && (
          <span id={`${id}-title-error`} className={styles.error}>
            {errors.title}
          </span>
        )}
      </label>

      <label className={styles.field}>
        <span className="caption">Recension</span>
        <textarea name="body" rows={5} maxLength={REVIEW_LIMITS.body.max} {...field("body")} />
        {errors.body && (
          <span id={`${id}-body-error`} className={styles.error}>
            {errors.body}
          </span>
        )}
      </label>

      {/* Honeypot: hidden from people and assistive tech, tempting for bots. */}
      <div className={styles.trap} aria-hidden="true">
        <label>
          Webbplats
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {message && (
        <p className={styles.error} role="alert">
          {message}
        </p>
      )}

      <div className={styles.actions}>
        <Button type="submit" disabled={status === "sending"}>
          {status === "sending" ? "Skickar …" : "Publicera recension"}
        </Button>
        <Button variant="ghost" onClick={() => setStatus("closed")}>
          Avbryt
        </Button>
      </div>
    </form>
  );
}
