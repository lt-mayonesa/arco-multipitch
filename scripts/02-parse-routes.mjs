// Step 2: parse raw WordPress post HTML into structured route data:
// pitches (length + grade), overall grade, crag/zone breadcrumb, photo URLs.
import fs from "node:fs/promises";
import * as cheerio from "cheerio";
import he from "he";
const { decode } = he;
import { toFrenchGrade, frenchGradeToScore, originalGradeSystem } from "./lib/gradeConvert.mjs";
import { extractImagesWithContext } from "./lib/photoContext.mjs";

const IN = new URL("../data/raw-posts.json", import.meta.url);
const OUT = new URL("../data/routes.parsed.json", import.meta.url);

const { posts, categoryIndex } = JSON.parse(await fs.readFile(IN, "utf8"));

// Matches a trailing "NNm, GRADE." / "NN metri, GRADE." pitch-summary sentence.
// Examples seen on the site: "35m, IV+.", "45 metri, 5c.", "22m, VI-.", "50m, 6a+.",
// plus alternatives after the first grade: "40m IV+." (no comma), "20m, 6b?/A0.",
// "35m, 6b o A0.", "25m, 6a/6a+.", "35m, VII/VII+ oppure VI e A0.",
// "30m, 6a+ dichiarato, probabile 6b+.", "25m, A0.". Only the first
// grade is kept as gradeRaw. Missing one of these shifts every later pitch number
// (and the photo -> pitch mapping with it), so captions naming a pitch ("sesto tiro")
// are a good regression check — see scripts/lib/photoContext.mjs.
const GRADE_TOKEN = "(?:[IVXivx]+[+-]?|[3-9][abc]?[+-]?)";
const PITCH_RE = new RegExp(
  `(\\d{1,3})\\s*(?:m|metri)\\b,?\\s*(${GRADE_TOKEN}|A[0-3])(?!\\w)[^.]{0,40}\\.?\\s*$`,
);
// Fallback for the older post style: grade given parenthetically at the end of the
// pitch paragraph with no explicit length, e.g. "...alla comoda sosta. (6a)",
// "(6b oppure A0).", "(6b, 4a)", "(4c, passo di 6a)". First grade is kept.
const PITCH_PARENS_RE = new RegExp(`\\((${GRADE_TOKEN})(?!\\w)[^()]{0,40}\\)\\s*\\.?\\s*$`);
// Any grade-looking token, used as a last-resort scan across the whole post.
const ANY_GRADE_RE = /\b([3-9][abc][+-]?|VI{0,3}[+-]?|IX[+-]?|IV[+-]?|I{1,3}[+-]?|X[+-]?)\b/g;
const LENGTH_ANYWHERE_RE = /(\d{2,4})\s*(?:m|metri)\b/i;
const TOTAL_LENGTH_RE = /\b(\d{3,4})\s*(?:m|metri)\b/i;

// Best-effort sun/shade + cardinal-orientation hint. The site rarely states this
// explicitly and structured extraction elsewhere is unreliable, so this is intentionally
// coarse: an explicit "esposizione: est/ovest/nord/sud" wins; otherwise we just flag
// whether the write-up talks about sun or shade at all. Shown as a soft hint in the UI,
// not a hard fact.
const CARDINAL_RE = /esposizion\w*\s*[:\-]?\s*(nord|sud|est|ovest)/i;
function extractSunHint(fullText) {
  const cardinal = CARDINAL_RE.exec(fullText);
  if (cardinal) return { orientation: cardinal[1].toLowerCase(), note: null };
  const sunny = /\bsole\b|soleggiat\w*|prende il sole/i.test(fullText);
  const shaded = /\bombra\b|ombreggiat\w*|in ombra/i.test(fullText);
  if (sunny && !shaded) return { orientation: null, note: "sunny-mentioned" };
  if (shaded && !sunny) return { orientation: null, note: "shaded-mentioned" };
  if (sunny && shaded) return { orientation: null, note: "mixed-mentioned" };
  return { orientation: null, note: null };
}

function parsePost(post) {
  const $ = cheerio.load(post.content.rendered);
  const paragraphs = [];
  $("p").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text) paragraphs.push(text);
  });

  const pitches = [];
  const pitchIdxs = [];
  let usedFallback = false;

  paragraphs.forEach((text, i) => {
    const m = PITCH_RE.exec(text);
    if (m) {
      pitches.push({
        pitch: pitches.length + 1,
        lengthM: Number(m[1]),
        gradeRaw: m[2],
        gradeSystem: originalGradeSystem(m[2]),
        gradeFrench: toFrenchGrade(m[2]),
      });
      pitchIdxs.push(i);
    }
  });

  if (pitches.length === 0) {
    // Older post style: "(6a)" at the end of each pitch paragraph, no explicit length.
    paragraphs.forEach((text, i) => {
      const m = PITCH_PARENS_RE.exec(text);
      if (m) {
        pitches.push({
          pitch: pitches.length + 1,
          lengthM: null,
          gradeRaw: m[1],
          gradeSystem: originalGradeSystem(m[1]),
          gradeFrench: toFrenchGrade(m[1]),
        });
        pitchIdxs.push(i);
        usedFallback = true;
      }
    });
  }

  let syntheticTotalLengthM = null;
  if (pitches.length === 0) {
    // Last resort: no structured per-pitch text at all. Scan the whole post for any
    // grade-like tokens (kept in reading order, deduped) and a rough total length.
    const fullText = paragraphs.join(" ");
    const seen = new Set();
    for (const m of fullText.matchAll(ANY_GRADE_RE)) {
      const raw = m[1];
      const fr = toFrenchGrade(raw);
      if (!fr || seen.has(fr)) continue;
      seen.add(fr);
      pitches.push({
        pitch: pitches.length + 1,
        lengthM: null,
        gradeRaw: raw,
        gradeSystem: originalGradeSystem(raw),
        gradeFrench: fr,
      });
    }
    const lenMatch = LENGTH_ANYWHERE_RE.exec(fullText);
    syntheticTotalLengthM = lenMatch ? Number(lenMatch[1]) : null;
    usedFallback = true;
  }

  const firstPitchIdx = pitchIdxs[0] ?? paragraphs.length;
  const lastPitchIdx = pitchIdxs[pitchIdxs.length - 1] ?? -1;

  // [{ url, captionIt, section: "approach"|"pitch"|"summary"|"unknown", pitch, basis }]
  // in document order. Order must stay stable: 05-download-photos names files by index.
  const images = extractImagesWithContext($, {
    pitchParagraphOrder: pitchIdxs.map((i) => paragraphs[i]),
    pitches,
    realPitchParagraphs: pitchIdxs.length > 0,
  });

  // Photo captions are shown with their photo, so keep them out of the prose blurbs.
  const captionTexts = new Set(images.map((i) => i.captionIt).filter(Boolean));
  const prose = (ps) => ps.filter((t) => !captionTexts.has(t));

  const introIt = usedFallback && pitchIdxs.length === 0
    ? prose(paragraphs)[0] ?? ""
    : prose(paragraphs.slice(0, firstPitchIdx)).join(" ");
  const outroIt = usedFallback && pitchIdxs.length === 0
    ? prose(paragraphs).at(-1) ?? ""
    : prose(paragraphs.slice(lastPitchIdx + 1)).join(" ");

  const pitchLengthSum = pitches.reduce((s, p) => s + (p.lengthM ?? 0), 0);
  // Parenthesised-grade posts give no per-pitch lengths; a "300 metri" style
  // mention (>= 100m, so not a pitch segment) is then the route's total.
  const statedTotalM = Number(TOTAL_LENGTH_RE.exec(paragraphs.join(" "))?.[1]) || 0;
  const totalLengthM = syntheticTotalLengthM ?? (pitchLengthSum || statedTotalM);

  const sunHint = extractSunHint(paragraphs.join(" "));
  const scored = pitches
    .map((p) => ({ ...p, score: frenchGradeToScore(p.gradeFrench) }))
    .filter((p) => p.score != null);
  const hardest = scored.sort((a, b) => b.score - a.score)[0];

  // Category chain: prefer the deepest/most specific category assigned to the post.
  const chains = post.categories.map((id) => categoryIndex[id]).filter(Boolean);
  chains.sort((a, b) => b.length - a.length);
  const chain = chains[0] ?? [];
  // Drop the generic root categories ("Arrampicata su roccia" tree parents aren't in chain anyway
  // since categoryIndex only covers descendants of Multipitch); chain[0] is "Multipitch" itself.
  const zoneChain = chain.slice(1).map((c) => c.name);
  const crag = zoneChain[zoneChain.length - 1] ?? "Unknown crag";

  return {
    id: post.id,
    slug: post.slug,
    title: decode(post.title.rendered),
    sourceUrl: post.link,
    date: post.date,
    crag: decode(crag),
    zoneChain: zoneChain.map(decode),
    introIt: decode(introIt),
    outroIt: decode(outroIt),
    pitches,
    numPitches: pitches.length,
    totalLengthM,
    overallGradeFrench: hardest?.gradeFrench ?? null,
    overallGradeRaw: hardest?.gradeRaw ?? null,
    images,
    approximateData: usedFallback,
    sunHint,
  };
}

const routes = posts.map(parsePost);

const noPitches = routes.filter((r) => r.numPitches === 0);
if (noPitches.length) {
  console.warn(
    `${noPitches.length} posts had no parsed pitch lines (kept anyway, check manually):`,
    noPitches.map((r) => r.slug),
  );
}

await fs.writeFile(OUT, JSON.stringify(routes, null, 2));
console.log(`Parsed ${routes.length} routes -> ${OUT.pathname}`);
