/**
 * Product search over the catalogue, shared by the header dialog (instant,
 * in the browser) and /sok (server-rendered, works without JavaScript).
 * Small catalogue, so a ranked scan beats shipping a search index.
 */
import { categories } from "@/data/products";
import type { Product } from "./types";

/** Lower case with å, ä and ö folded, so "vagg" finds "Vägghylla" and typing without Swedish letters works. */
export function fold(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface Indexed {
  product: Product;
  name: string;
  words: string;
}

function index(p: Product): Indexed {
  const category = categories.find((c) => c.id === p.category);
  const colors = p.options.find((o) => o.id === "color")?.values.map((v) => v.label) ?? [];
  const material = p.specs.find((s) => s.label === "Material")?.value ?? "";
  return {
    product: p,
    name: fold(p.name),
    words: fold([p.tagline, p.slug, category?.name ?? "", category?.description ?? "", material, ...colors].join(" ")),
  };
}

/** Shorter terms only match at the start of a word, so "ek" finds oak, not "rektangulär". */
const MIN_INFIX = 4;

/** 3 = the text starts with the term, 2 = a word does, 1 = inside a word (compounds: "lampa" in "bordslampa"), 0 = no match. */
function matchLevel(text: string, term: string): number {
  if (text.startsWith(term)) return 3;
  if (text.includes(` ${term}`)) return 2;
  if (term.length >= MIN_INFIX && text.includes(term)) return 1;
  return 0;
}

/**
 * Every query word must match somewhere: at the start of a word, or inside a
 * word for terms of four letters or more, since Swedish writes compounds as one
 * word. Name matches rank above matches in the tagline, category, colour or
 * material, and word-start matches rank above matches inside a word.
 */
export function searchProducts(products: Product[], query: string, limit = 50): Product[] {
  const terms = fold(query).split(" ").filter(Boolean);
  if (terms.length === 0) return [];
  const scored: { product: Product; score: number }[] = [];
  for (const item of products.map(index)) {
    let score = 0;
    let all = true;
    for (const t of terms) {
      const inName = matchLevel(item.name, t);
      const inWords = matchLevel(item.words, t);
      if (!inName && !inWords) {
        all = false;
        break;
      }
      // Word-start anywhere beats inside a word; within each, name beats the rest.
      score += Math.max([0, 1, 4, 6][inName], [0, 0.5, 2, 2][inWords]);
    }
    if (all) scored.push({ product: item.product, score });
  }
  return scored
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name, "sv"))
    .slice(0, limit)
    .map((s) => s.product);
}

/** A few starting points shown before anything is typed. */
export const SEARCH_SUGGESTIONS = ["Lampa", "Vas", "Grafit", "Stengods", "Ek"];
