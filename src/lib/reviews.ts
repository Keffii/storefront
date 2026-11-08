/** Review types and validation, shared by the form and the API route. */

export interface Review {
  id: string;
  slug: string;
  name: string;
  rating: number; // 1–5
  title: string;
  body: string;
  createdAt: string;
  /** Written by a signed-in customer with a paid order containing the product. */
  verified?: boolean;
}

export interface RatingSummary {
  count: number;
  average: number; // 0 when count is 0
}

export interface ReviewInput {
  name: string;
  rating: number;
  title: string;
  body: string;
}

export const REVIEW_LIMITS = {
  name: { min: 2, max: 40 },
  title: { max: 80 },
  body: { min: 20, max: 1000 },
} as const;

export type ReviewErrors = Partial<Record<keyof ReviewInput, string>>;

const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");

/** Normalises whitespace and checks lengths. Returns the cleaned input or field errors. */
export function validateReview(raw: Record<string, unknown>): { ok: true; value: ReviewInput } | { ok: false; errors: ReviewErrors } {
  const name = clean(raw.name);
  const title = clean(raw.title);
  // Keep paragraph breaks in the body, collapse other whitespace.
  const body = typeof raw.body === "string" ? raw.body.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim() : "";
  const rating = Number(raw.rating);
  const errors: ReviewErrors = {};

  if (name.length < REVIEW_LIMITS.name.min) errors.name = "Skriv ditt namn (minst 2 tecken).";
  else if (name.length > REVIEW_LIMITS.name.max) errors.name = `Namnet får vara högst ${REVIEW_LIMITS.name.max} tecken.`;
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.rating = "Välj ett betyg mellan 1 och 5 stjärnor.";
  if (title.length > REVIEW_LIMITS.title.max) errors.title = `Rubriken får vara högst ${REVIEW_LIMITS.title.max} tecken.`;
  if (body.length < REVIEW_LIMITS.body.min) errors.body = `Skriv minst ${REVIEW_LIMITS.body.min} tecken om produkten.`;
  else if (body.length > REVIEW_LIMITS.body.max) errors.body = `Recensionen får vara högst ${REVIEW_LIMITS.body.max} tecken.`;

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: { name, rating, title, body } };
}

export function summarise(count: number, sum: number): RatingSummary {
  return { count, average: count > 0 ? Math.round((sum / count) * 10) / 10 : 0 };
}

/** 4.5 → "4,5" */
export const formatRating = (n: number) => n.toLocaleString("sv-SE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
