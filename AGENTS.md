# AGENTS.md

Offline-capable PWA crib sheet for Arco / Valle del Sarca multipitch routes,
scraped from howtoreachthesky.com. Vite + React 19 + TypeScript,
`react-leaflet` (OSM tiles), `vite-plugin-pwa`. Deployed to GitHub Pages.
See `README.md` for product overview and full scraper pipeline.

## Commands

```bash
npm install
npm run dev       # Vite dev server (base path /arco-multipitch/)
npm run lint      # oxlint (.oxlintrc.json)
npm run build     # tsc -b && vite build -> dist/
npm run preview   # serve dist/ (test service worker / offline here, not in dev)
```

No test suite. **Before declaring work done, run `npm run lint && npm run build`**
and both must pass. Don't add new lint warnings (a few pre-existing ones in
`scripts/` and `PhotoModal.tsx` are known).

## Layout

- `src/App.tsx` — shell: header, map, bottom sheet (list ↔ route detail).
- `src/components/` — `MapView` (Leaflet), `FilterBar`, `SortMenu`,
  `RouteCard`, `RouteDetail`, `PhotoModal`, `GradeBadge`.
- `src/lib/` — hooks and helpers: `useFilters` (filter/sort state + logic),
  `useFavorites` (localStorage trip list), `useHashRoute` (`#/route/<slug>`
  router), bottom-sheet hook, `grades.ts` (French grade scale),
  `photoGroups.ts`, `leafletIconFix.ts`.
- `src/types.ts` — `Route` / `Pitch` / `Location` schema. Source of truth for data shape.
- `src/data/routes.json` — shipped dataset (copy of `data/routes.json`).
- `scripts/` — one-off Node scraping pipeline (`01`–`05`, run in order; see README).
- `data/` — pipeline inputs/outputs. Only `routes.json` and `translation-*.md`
  are committed; the rest is gitignored intermediate state.
- `public/photos/<slug>/NN.webp` — route photos (~110MB, lazily cached by SW).
- `design/` — static mockups and issue write-ups (`*.noqa.md`). Not part of the build.

## Rules

- **Never hand-edit `src/data/routes.json` or `data/routes.json`.** Change the
  relevant `scripts/` step, re-run the pipeline, then
  `cp data/routes.json src/data/routes.json`.
- **Never use a free machine-translation API** for `data/translation-en.md`
  (MyMemory once silently cached quota-error text as translations). Translate
  by hand/LLM and run `04b-merge-translations.mjs`, which sanity-checks output.
- **Mobile-first.** Primary target is phones; app column is capped at 520px.
  Check UI changes at 390px wide (devtools device mode) incl. touch gestures.
- Asset URLs must go through `import.meta.env.BASE_URL` (app is served from
  `/arco-multipitch/`). Keep `vite.config.ts` `base`, manifest `start_url`
  and `scope` in sync.
- Keep the app working offline: new runtime fetches need a Workbox
  `runtimeCaching` entry or must degrade gracefully without network.
- Plain CSS in `src/App.css` / `src/index.css`, BEM-ish class names
  (`block__elem--mod`), colours via CSS vars in `:root`. No CSS frameworks.
- No router library; extend `useHashRoute` instead.

## Gotchas

- **Leaflet must be told when its container resizes** (`map.invalidateSize()`),
  otherwise tiles render only in the old area (grey band). Prefer layouts where
  the map container size is constant and UI slides *over* it.
- Leaflet default marker images need `src/lib/leafletIconFix.ts` under Vite.
- Photo → pitch grouping in `photoGroups.ts` is a positional guess, not real
  data. See `design/photo-pitch-mapping.noqa.md` before touching it.
- ~9 routes have `approximateData: true` (unparseable pitch data); UI must keep
  showing the warning + source link.
- Grade conversion (UIAA → French) is approximate; logic duplicated in
  `scripts/lib/gradeConvert.mjs` and `src/lib/grades.ts` — keep them in sync.
- Route text/photos are © howtoreachthesky.com; every route detail must keep
  its link back to `sourceUrl`.

## Commits

- Imperative, sentence-case subject, no type prefix; optional `: detail`
  (e.g. `Fix translation pipeline: replace flaky free-API translation`).
- One logical change per commit. Pushing to `main` deploys via
  `.github/workflows/deploy.yml`.
