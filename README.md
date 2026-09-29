# Arco Multipitch

A small offline-capable PWA crib sheet for multipitch climbing routes around
Arco / Valle del Sarca (and a few further-flung Trentino/Veneto zones), built
from trip reports on **[howtoreachthesky.com](https://howtoreachthesky.com/)**.

Every route card shows: overall + per-pitch grades (converted to the French
scale, original grade kept alongside), length, pitch count, crag/zone, an
interactive map, a short English trip-notes summary, photos, and a link back
to the original write-up. Mark routes you want to do with ★ — that list works
fully offline once the app has been opened once.

**All route text/photos are © howtoreachthesky.com** — this app is a personal
trip-planning aid for a small group, not a redistribution product. Every route
detail links back to its source.

## Stack

- Vite + React + TypeScript
- `react-leaflet` + OpenStreetMap tiles for the map (tiles need a connection;
  everything else works offline)
- `vite-plugin-pwa` for the offline service worker + installable manifest
- A one-off Node scraping pipeline (`scripts/`) that produced `src/data/routes.json`

## Development

```bash
npm install
npm run dev
```

## Build / preview

```bash
npm run build
npm run preview
```

## Deploying to GitHub Pages

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds the
app and publishes `dist/` to GitHub Pages. Enable Pages once, under
**Settings → Pages → Source: GitHub Actions**.

The app will be live at `https://<user>.github.io/arco-multipitch/`. Open it
on your phone and use the browser's "Add to Home Screen" / "Install app"
option — from then on it works offline (route data, photos, and previously
viewed map tiles are cached by the service worker).

## Re-running the scraper

The `data/routes.json` / `src/data/routes.json` dataset was generated once by
the pipeline in `scripts/`, run in order:

1. `01-fetch-posts.mjs` — crawl the WordPress REST API for every post under the
   "Multipitch" category tree (and all nested crag/sector sub-categories).
2. `02-parse-routes.mjs` — parse each post's HTML into structured pitches
   (length + grade), overall grade, crag/zone breadcrumb, photo URLs, and a
   best-effort sun/shade hint.
3. `03-geocode.mjs` — resolve coordinates per route: first from the author's
   own [Google My Maps](https://www.google.com/maps/d/viewer?mid=1GiPSPBfJ3fAEv9aDSrHRLjdJZsBSdjT3)
   KML export (matched by source URL), then OpenStreetMap Nominatim by
   crag/zone name, with a few manual overrides for crags Nominatim doesn't know.
4. `04-export-for-translation.mjs` — dump every route's Italian intro/outro
   blurb into `data/translation-source.md`, keyed by `<slug>::intro` /
   `<slug>::outro`.
5. Translate `data/translation-source.md` into `data/translation-en.md`
   (same keys) — done directly by hand/LLM, **not** via a free translation API.
   An earlier version of this pipeline used the free MyMemory API and silently
   cached its "daily quota exceeded" warning message as if it were a real
   translation once the quota ran out (~50 routes ended up with garbage
   English text) — worth knowing if you ever reach for a free translation API
   here again. Don't.
6. `04b-merge-translations.mjs` — merge `translation-en.md` back into the
   dataset, with a sanity check that no quota-warning-style garbage slipped in.
7. `05-download-photos.mjs` — download, reorient, resize (1280px) and
   re-encode (WebP) every route photo into `public/photos/<slug>/`, and write
   the final `data/routes.json`.

```bash
node scripts/01-fetch-posts.mjs
node scripts/02-parse-routes.mjs
node scripts/03-geocode.mjs
node scripts/04-export-for-translation.mjs
# translate data/translation-source.md -> data/translation-en.md here
node scripts/04b-merge-translations.mjs
node scripts/05-download-photos.mjs
cp data/routes.json src/data/routes.json
```

Grades are converted from the Italian/UIAA Roman-numeral scale to French sport
grades using an approximate published equivalence table
(`scripts/lib/gradeConvert.mjs` / `src/lib/grades.ts`) — treat borderline
conversions as indicative, not exact.

A handful of older posts (~9/69) don't follow the site's usual
"NNm, GRADE." per-pitch sentence pattern; those are flagged with
`approximateData: true` and shown with a warning in the app, with a link back
to the original post for the real beta.
