// Step 4: translate the short intro/outro blurbs (Italian -> English) via the free
// MyMemory Translation API. No API key required; we stay well under its rate limits
// by translating short strings sequentially with a delay, and cache aggressively so
// re-runs are cheap.
import fs from "node:fs/promises";

const IN = new URL("../data/routes.geo.json", import.meta.url);
const OUT = new URL("../data/routes.translated.json", import.meta.url);
const CACHE = new URL("../data/translate-cache.json", import.meta.url);

const routes = JSON.parse(await fs.readFile(IN, "utf8"));

let cache = {};
try {
  cache = JSON.parse(await fs.readFile(CACHE, "utf8"));
} catch {
  /* first run */
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// MyMemory caps single requests at 500 bytes; our intro/outro blurbs are short but
// occasionally longer, so we chunk on sentence boundaries when needed.
function chunkText(text, maxLen = 450) {
  if (text.length <= maxLen) return [text];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let cur = "";
  for (const s of sentences) {
    if ((cur + " " + s).length > maxLen && cur) {
      chunks.push(cur.trim());
      cur = s;
    } else {
      cur = cur ? `${cur} ${s}` : s;
    }
  }
  if (cur) chunks.push(cur.trim());
  return chunks;
}

async function translateOne(text) {
  if (!text || !text.trim()) return "";
  if (cache[text] !== undefined) return cache[text];

  const chunks = chunkText(text);
  const translated = [];
  for (const chunk of chunks) {
    if (cache[chunk] !== undefined) {
      translated.push(cache[chunk]);
      continue;
    }
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(chunk)}&langpair=it|en`;
    let result = chunk;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const res = await fetch(url);
        const body = await res.json();
        if (body?.responseData?.translatedText) {
          result = body.responseData.translatedText;
          break;
        }
      } catch (e) {
        console.warn("translate error, retrying:", e.message);
      }
      await sleep(2000 * (attempt + 1));
    }
    cache[chunk] = result;
    translated.push(result);
    await sleep(600);
  }
  const full = translated.join(" ");
  cache[text] = full;
  return full;
}

const out = [];
for (const [i, route] of routes.entries()) {
  const introEn = await translateOne(route.introIt);
  const outroEn = await translateOne(route.outroIt);
  out.push({ ...route, introEn, outroEn });
  await fs.writeFile(CACHE, JSON.stringify(cache, null, 2));
  console.log(`[${i + 1}/${routes.length}] ${route.title}`);
}

await fs.writeFile(OUT, JSON.stringify(out, null, 2));
console.log(`Wrote ${OUT.pathname}`);
