// Prints every Lighthouse audit that scored below 1 in the given reports
// folder, so a failing CI budget says why without downloading artifacts.
//
//   node scripts/lighthouse-failures.mjs .lighthouseci
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dir = process.argv[2] ?? ".lighthouseci";
const seen = new Set();
for (const file of readdirSync(dir).filter((f) => f.startsWith("lhr-") && f.endsWith(".json"))) {
  const r = JSON.parse(readFileSync(join(dir, file), "utf8"));
  for (const [cat, c] of Object.entries(r.categories)) {
    for (const ref of c.auditRefs) {
      const a = r.audits[ref.id];
      if (!ref.weight || a.score === null || a.score >= 1) continue;
      const key = `${r.requestedUrl} ${ref.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const items = (a.details?.items ?? []).slice(0, 3).map((i) => JSON.stringify(i).slice(0, 200));
      console.log(`${r.requestedUrl}  [${cat}] ${ref.id} (${a.score}): ${a.title}`);
      for (const i of items) console.log(`    ${i}`);
    }
  }
}
