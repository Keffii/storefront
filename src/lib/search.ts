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
    words: fold([p.tagline, category?.name ?? "", category?.description ?? "", material, ...colors].join(" ")),
  };
}

/**
 * Every query word must match somewhere (as a word prefix). Name matches rank
 * above matches in the tagline, category, colour or material.
 */
export function searchProducts(products: Product[], query: string, limit = 50): Product[] {
  const terms = fold(query).split(" ").filter(Boolean);
  if (terms.length === 0) return [];
  const scored: { product: Product; score: number }[] = [];
  for (const item of products.map(index)) {
    let score = 0;
    let all = true;
    for (const t of terms) {
      const inName = new RegExp(`(^| )${t}`).test(item.name);
      const inWords = new RegExp(`(^| )${t}`).test(item.words);
      if (!inName && !inWords) {
        all = false;
        break;
      }
      score += inName ? (item.name.startsWith(t) ? 6 : 4) : 1;
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
