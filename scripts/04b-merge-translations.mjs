// Step 4b: merge hand-translated (or LLM-translated) English text from
// data/translation-en.md back into the route dataset. Replaces the old
// MyMemory-API-based 04-translate.mjs, which silently cached the API's quota-exceeded
// warning message as if it were a real translation once the free daily quota ran out.
import fs from "node:fs/promises";

const ROUTES_IN = new URL("../data/routes.geo.json", import.meta.url);
const TRANSLATIONS_IN = new URL("../data/translation-en.md", import.meta.url);
const OUT = new URL("../data/routes.translated.json", import.meta.url);

function parseTranslations(md) {
  const map = new Map();
  const blocks = md.split(/^## /m).slice(1); // drop leading comment header
  for (const block of blocks) {
    const newlineIdx = block.indexOf("\n");
    const key = block.slice(0, newlineIdx).trim();
    let text = block.slice(newlineIdx + 1).trim();
    if (text === "*(empty)*") text = "";
    map.set(key, text);
  }
  return map;
}

const routes = JSON.parse(await fs.readFile(ROUTES_IN, "utf8"));
const translations = parseTranslations(await fs.readFile(TRANSLATIONS_IN, "utf8"));

const missing = [];
const out = routes.map((r) => {
  const introKey = `${r.slug}::intro`;
  const outroKey = `${r.slug}::outro`;
  if (!translations.has(introKey)) missing.push(introKey);
  if (!translations.has(outroKey)) missing.push(outroKey);
  return {
    ...r,
    introEn: translations.get(introKey) ?? "",
    outroEn: translations.get(outroKey) ?? "",
  };
});

if (missing.length) {
  console.warn(`Missing ${missing.length} translation keys:`, missing);
}

// Sanity check: make sure no leftover garbage from the old API bug survives.
const stillBroken = out.filter(
  (r) => /MYMEMORY WARNING/i.test(r.introEn) || /MYMEMORY WARNING/i.test(r.outroEn),
);
if (stillBroken.length) {
  throw new Error(
    `${stillBroken.length} routes still contain MYMEMORY WARNING garbage: ${stillBroken.map((r) => r.slug).join(", ")}`,
  );
}

await fs.writeFile(OUT, JSON.stringify(out, null, 2));
console.log(`Merged translations for ${out.length} routes -> ${OUT.pathname}`);
