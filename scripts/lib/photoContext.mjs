// Recovers per-photo context from a post's HTML: which part of the write-up each
// image sits in (approach / pitch N / summary) and its caption, if any.
//
// Posts on howtoreachthesky.com follow a fairly consistent rhythm:
//   <p>intro…</p> [approach photos]
//   <p>pitch 1 text… 25m, 4a.</p> <figure><img/></figure> <p class="has-text-align-center">caption</p>
//   <p>pitch 2 text… 25m, 6a.</p> …
//   <p>outro…</p> [summit / topo photos]
// Older posts use `figure.wp-caption > figcaption` instead of a centred <p>.
//
// Two independent signals are combined:
//   1. position: the last pitch paragraph (as detected by 02-parse-routes) seen
//      before the image;
//   2. the caption: it often names the pitch outright ("primo tiro",
//      "settima lunghezza", "ultimo tiro", "L3").
// When they disagree, neither is reliably right: the parser can miss a pitch
// paragraph (shifting position), and the author sometimes miscounts or numbers
// pitches of the original line while climbing a variant. Captions usually end
// with the pitch grade ("…del sesto tiro, 6b."), so that breaks the tie: the
// caption's pitch number wins unless its grade doesn't match that pitch.

const ORDINALS = [
  ["prim", 1], ["second", 2], ["terz", 3], ["quart", 4], ["quint", 5],
  ["sest", 6], ["settim", 7], ["ottav", 8], ["non", 9], ["decim", 10],
  ["undicesim", 11], ["dodicesim", 12], ["tredicesim", 13], ["quattordicesim", 14],
  ["quindicesim", 15],
];
const ORD_ALT = ORDINALS.map(([stem]) => stem).join("|");
// Pitch nouns, tolerating the site's typos ("lunchezza", "lughezza").
const PITCH_NOUN = "(?:tiro|lu\\w{0,2}ghezza)";
// "primo tiro", "seconda lunghezza", "sosta del terzo tiro"
const ORD_PITCH_RE = new RegExp(`\\b(${ORD_ALT})[oa]\\s+${PITCH_NOUN}\\b`, "i");
// "in arrivo alla seconda sosta" — the belay at the end of pitch N
const ORD_BELAY_RE = new RegExp(`\\b(${ORD_ALT})a\\s+sosta\\b`, "i");
// "7° tiro", "tiro 3", "lunghezza 4"
const NUM_PITCH_RE = new RegExp(`\\b(\\d{1,2})°\\s*${PITCH_NOUN}\\b|\\b${PITCH_NOUN}\\s+(\\d{1,2})\\b`, "i");
// "L3", "S7" (belay 7 = end of pitch 7), "prima di S3"
const L_OR_S_RE = /\b[LS](\d{1,2})\b/;
const PENULTIMATE_RE = new RegExp(`\\bpenultim[oa]\\s+${PITCH_NOUN}\\b`, "i");
const LAST_PITCH_RE = new RegExp(`\\bultim[oa]\\s+${PITCH_NOUN}\\b|\\buscita\\s+d[ae]lla\\s+via\\b`, "i");
const APPROACH_RE = /\battacco\b|\bavvicinamento\b|\bsentiero\s+d[i']\s*accesso\b|\bpartenza\s+della\s+via\b/i;
const SUMMARY_RE = /\bcima\b|\bvetta\b|\bdiscesa\b|\bschizzo\b|\btracciato\b|\brelazione\b|\bpanorama\b|\bvista\s+dall/i;

// Trailing grade in a caption: "…, 6a/6a+.", "… (5c)", "…, VI e A0 oppure VIII."
const GRADE_TOKEN = "(?:[IVX]+[+-]?|[3-9][abc]?[+-]?|A[0-3])";
const CAPTION_GRADE_RE = new RegExp(`[,(]\\s*(${GRADE_TOKEN})(?![\\w])[^,(]*$`);

export function gradeFromCaption(caption) {
  return caption ? (CAPTION_GRADE_RE.exec(caption)?.[1] ?? null) : null;
}

const sameGrade = (a, b) => a != null && b != null && a.toLowerCase() === b.toLowerCase();

function ordinalToNumber(stem) {
  const s = stem.toLowerCase();
  return ORDINALS.find(([st]) => st === s)?.[1] ?? null;
}

/** Pitch number named in a caption, "last", "penultimate", or null. */
export function pitchFromCaption(caption) {
  if (!caption) return null;
  let m = ORD_PITCH_RE.exec(caption) ?? ORD_BELAY_RE.exec(caption);
  if (m) return ordinalToNumber(m[1]);
  m = NUM_PITCH_RE.exec(caption);
  if (m) return Number(m[1] ?? m[2]);
  m = L_OR_S_RE.exec(caption);
  if (m) return Number(m[1]);
  if (PENULTIMATE_RE.test(caption)) return "penultimate";
  if (LAST_PITCH_RE.test(caption)) return "last";
  return null;
}

const clean = (s) => s.replace(/\s+/g, " ").trim();

export function imageUrl($, el) {
  const src = $(el).attr("data-orig-file") || $(el).attr("data-large-file") || $(el).attr("src");
  if (!src) return null;
  const url = src.split("?")[0];
  if (/\/wp-content\/uploads\//.test(url) && /\.(jpe?g|png|webp)$/i.test(url)) return url;
  return null;
}

/**
 * @param $ cheerio root of the post body
 * @param {string[]} pitchParagraphOrder normalised text of the paragraphs that
 *   02-parse-routes recognised as pitch descriptions, in pitch order
 * @param {{gradeRaw: string}[]} pitches parsed pitches
 * @param {boolean} realPitchParagraphs false when pitches were synthesised
 *   from grade tokens (no per-pitch paragraphs exist)
 * @returns {{url, captionIt, section, pitch, basis}[]} one entry per unique
 *   image URL in document order (same order as the legacy flat list)
 */
export function extractImagesWithContext($, { pitchParagraphOrder, pitches, realPitchParagraphs }) {
  const numPitches = pitches.length;
  const pitchIdxByText = new Map();
  pitchParagraphOrder.forEach((t, i) => {
    if (!pitchIdxByText.has(t)) pitchIdxByText.set(t, i + 1);
  });

  const top = $("body").children().toArray();
  const out = [];
  const seen = new Set();

  // Positional state.
  let currentPitch = 0; // 0 = before first pitch paragraph (approach)
  let afterOutro = false; // saw a non-caption, non-pitch paragraph after the last pitch

  const isCaptionPara = (el) => {
    if (!el || el.tagName !== "p") return false;
    const cls = $(el).attr("class") || "";
    return /has-text-align-center/.test(cls) && $(el).find("img").length === 0 && clean($(el).text()) !== "";
  };

  for (let i = 0; i < top.length; i++) {
    const el = top[i];
    const imgs = $(el).is("img") ? [el] : $(el).find("img").toArray();

    // A few old posts put the <img> inside the pitch paragraph itself.
    if (imgs.length > 0 && el.tagName === "p") {
      const idx = pitchIdxByText.get(clean($(el).text()));
      if (idx) {
        currentPitch = idx;
        afterOutro = false;
      }
    }

    if (imgs.length === 0) {
      if (el.tagName !== "p") continue;
      const text = clean($(el).text());
      if (!text) continue;
      const idx = pitchIdxByText.get(text);
      if (idx) {
        currentPitch = idx;
        afterOutro = false;
      } else if (!isCaptionPara(el) && realPitchParagraphs && currentPitch === numPitches && numPitches > 0) {
        afterOutro = true;
      }
      continue;
    }

    // Caption: figcaption inside the block, else a centred paragraph right after
    // it (skipping empty spacer paragraphs used by the older editor).
    let caption = clean($(el).find("figcaption, .wp-caption-text").first().text());
    if (!caption) {
      let j = i + 1;
      while (j < top.length && top[j].tagName === "p" && !clean($(top[j]).text()) && $(top[j]).find("img").length === 0) j++;
      if (isCaptionPara(top[j])) caption = clean($(top[j]).text());
    }

    for (const img of imgs) {
      const url = imageUrl($, img);
      if (!url || seen.has(url)) continue;
      seen.add(url);

      let section;
      let pitch = null;
      let basis = "position";
      if (!realPitchParagraphs) {
        section = "unknown";
      } else if (currentPitch === 0) {
        section = "approach";
      } else if (afterOutro) {
        section = "summary";
      } else {
        section = "pitch";
        pitch = currentPitch;
      }

      // Caption overrides position when it names a pitch explicitly.
      const named = pitchFromCaption(caption);
      if (named != null && numPitches > 0) {
        const n = named === "last" ? numPitches : named === "penultimate" ? numPitches - 1 : named;
        if (n >= 1 && n <= numPitches) {
          if (section === "pitch" && pitch === n) {
            basis = "position+caption";
          } else {
            const g = gradeFromCaption(caption);
            const posMatches = section === "pitch" && sameGrade(g, pitches[pitch - 1]?.gradeRaw);
            const capMatches = sameGrade(g, pitches[n - 1]?.gradeRaw);
            // Caption wins unless its own grade contradicts it.
            const keepPosition = section === "pitch" && g != null && !capMatches;
            if (keepPosition) {
              basis = posMatches ? "position+grade" : "position";
            } else {
              basis = "caption";
              section = "pitch";
              pitch = n;
            }
          }
        }
      } else if (caption && section === "unknown") {
        if (APPROACH_RE.test(caption)) { section = "approach"; basis = "caption"; }
        else if (SUMMARY_RE.test(caption)) { section = "summary"; basis = "caption"; }
      }

      out.push({ url, captionIt: caption || null, section, pitch, basis });
    }
  }
  return out;
}
