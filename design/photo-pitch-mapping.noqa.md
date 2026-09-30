# Issue: photos have no real association with pitches

## Summary

Each route's photos are stored and displayed as a flat, ordered list with no
actual link to which pitch (or approach/summit) they show. The current UI
*looks* like it groups photos by pitch, but that grouping is a guess, not
real data — it can be, and often is, wrong.

## Where this shows up

- `src/components/RouteDetail.tsx` renders photo groups with labels like
  "Pitch 3 · 6a" using `groupPhotosByPitch()` from `src/lib/photoGroups.ts`.
- That function has no actual per-photo pitch information to work with. It
  just takes the flat `route.photos` array and spreads it proportionally
  across `["Approach", ...pitches, "Summary"]` slots based on array position:

  ```ts
  // src/lib/photoGroups.ts
  const slot = Math.min(
    slotLabels.length - 1,
    Math.floor((i / photos.length) * slotLabels.length),
  );
  ```

  This is pure math on array indices, not a read of which pitch a photo
  actually belongs to. The code comment there already flags it as
  "an approximation, not a verified per-pitch match", and the UI shows a
  small disclaimer under the "Photos" heading for the same reason — the
  underlying data problem was never actually fixed, just labeled.

## Root cause

The scraper (`scripts/02-parse-routes.mjs`) throws away the information that
would make real association possible.

- Source posts on howtoreachthesky.com interleave content roughly as:
  `<p>pitch 1 text…</p> <figure><img/><figcaption>caption, often mentions the
  pitch grade</figcaption></figure> <p>pitch 2 text…</p> <img/> …`
- The scraper's `extractImages($)` function does this instead:

  ```js
  // scripts/02-parse-routes.mjs
  function extractImages($) {
    const urls = new Set();
    $("img").each((_, el) => {
      const src = $(el).attr("data-orig-file") || $(el).attr("data-large-file") || $(el).attr("src");
      ...
      urls.add(clean);
    });
    return [...urls];
  }
  ```

  It just collects every `<img>` src on the page, in document order, into a
  flat array. It does **not** record:
  - which pitch paragraph (if any) each image immediately follows,
  - the `<figcaption>` text next to each image (which on this site often
    directly states the pitch number/grade, e.g. *"Monica al termine del
    primo tiro, IV+."* → "Monica at the end of the first pitch, IV+."),
  - whether an image belongs to the intro (approach) or outro (summary/topo)
    text instead of any pitch at all.

  That association data is present in the source HTML but is discarded
  during parsing, before it ever reaches `data/routes.json` /
  `src/data/routes.json`.

## Why the current "fix" isn't one

Photo count and pitch count are frequently very different for the same
route, which makes evenly/proportionally spreading photos across pitch slots
unreliable. Examples from the live dataset (`pitches` vs `photos`):

| slug | pitches | photos |
| --- | --- | --- |
| `lungo-il-fiume-e-sullacqua` | 1 | 5 |
| `karlovacko` | 2 | 5 |
| `di-tutto-un-po` | 7 | 10 |
| `sguarauunda` | 6 | 9 |
| `fiaba-nel-bosco` | 8 | 4 |
| `minuetto-a-ceniga` | 7 | 4 |
| `porci-con-le-ali` | 3 | 6 |
| `cima-alle-coste-parete-di-sherwood-via-little-john` | 0 | 3 |

With that much mismatch, the proportional-slot math regularly puts a photo
under the wrong pitch label, or drops multiple unrelated photos into the same
"Approach"/"Summary" bucket just because of where they happen to fall in the
array.

## Data currently available vs. missing

Available today, per route, in `data/routes.json`:
- `photos: string[]` — flat, ordered list of local image paths, no metadata.
- `pitches: { pitch, lengthM, gradeRaw, gradeSystem, gradeFrench }[]` — no
  photo reference.

Missing / discarded during scraping:
- Per-image position relative to the pitch paragraphs in the original post.
- Per-image `<figcaption>` text (often names the climber and/or the pitch's
  grade, sometimes the pitch number).
- Any flag for "this image is an approach/summit shot, not a pitch shot."

## Scope of affected code

- `scripts/02-parse-routes.mjs` — `extractImages()`, and the point where
  `images` is attached to each parsed route (would need to become
  richer objects instead of bare URL strings).
- `scripts/05-download-photos.mjs` — builds the final `photos` array from
  `route.images`; downstream of whatever `extractImages()` produces.
- `data/routes.json` / `src/data/routes.json` — schema currently has
  `photos: string[]`; would need a shape change to carry per-photo metadata.
- `src/types.ts` — `Route.photos: string[]`.
- `src/lib/photoGroups.ts` — the guessing logic that should be replaced (or
  removed, if real per-photo pitch data becomes available and grouping can
  be done directly from it).
- `src/components/RouteDetail.tsx` — consumes `groupPhotosByPitch()`.

## Not addressed here

This file only documents the problem and the current (approximate,
disclaimer-flagged) workaround. It intentionally does not prescribe a fix
approach — that's left for whoever picks this up.

---

## Resolution

Fixed at scrape time; `groupPhotosByPitch()` no longer guesses.

- `scripts/lib/photoContext.mjs` walks the post's top-level blocks in order and,
  per image, records its caption (`figcaption`, or the centred `<p>` right
  after the image block) and its section: `approach` (before the first pitch
  paragraph), `pitch` N (after pitch paragraph N), `summary` (after the outro
  starts), or `unknown` (routes with no real pitch paragraphs).
- The caption cross-checks position: if it names a pitch ("terzo tiro",
  "settima lunghezza", "7° tiro", "S7", "ultimo tiro", "penultimo tiro") and
  disagrees with position, the caption wins unless its trailing grade
  ("…, 6b.") doesn't match that pitch's grade. Needed because the author
  sometimes miscounts or numbers pitches of the original line while climbing
  a variant (e.g. `di-tutto-un-po`, `diedro-rosso`).
- Using captions as an oracle exposed ~30 pitch paragraphs the pitch regex
  missed (`40m IV+.`, `20m, 6b?/A0.`, `35m, 6b o A0.`, `(6b, 4a)` …), which
  shifted every later pitch number. `PITCH_RE` / `PITCH_PARENS_RE` in
  `02-parse-routes.mjs` now accept those; 24 routes gained pitches (and fixed
  totals/overall grades). Caption paragraphs are also excluded from the
  intro/outro blurbs.
- Captions are translated like the blurbs (`<slug>::photo-NN` keys in
  `data/translation-en.md`) and shipped as `Photo.captionIt/captionEn`.
- Result over 453 photos: ~375 position and caption agree, ~45 position only
  (no pitch named), ~15 position kept by grade, ~10 caption override, 9
  approach/summary/unknown. Known leftovers: `apollo` (a pitch paragraph with
  no length/grade), `lungo-il-fiume-e-sullacqua` (free-form post, 1 parsed
  pitch), `sguarauunda` ("nono tiro – quello sbagliato").
