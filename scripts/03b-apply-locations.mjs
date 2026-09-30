// Step 3b: attach the curated location of every route from data/locations.json
// (committed, hand-researched once per route). No network, no heuristics.
//
// data/locations.json, keyed by route slug:
//   {
//     "name":    wall / sector name the point refers to,
//     "wall":    { lat, lon, precision, source }  -- base of the route, or the wall
//                                                  itself when the start isn't pinned,
//     "parking": { lat, lon, precision, source } | null  -- where the approach starts,
//     "note":    free text (how it was located, caveats)
//   }
//   precision: "exact"  -- pinned from a named map feature / published coordinates,
//              "approx" -- best estimate from descriptions (e.g. "park by the church"),
//              "guess"  -- unreviewed output of 03-seed-locations.mjs.
//   source: where the point came from (e.g. "osm: Parete Rigata (cliff)",
//           "thetopo.com", "mymaps: Diedro Rosso", "post: approach text").
//
// Fails if a route has no entry (run 03-seed-locations.mjs, then review); warns on
// unreviewed guesses and on entries for slugs that no longer exist.
import fs from "node:fs/promises";

const ROUTES_IN = new URL("../data/routes.parsed.json", import.meta.url);
const LOCATIONS = new URL("../data/locations.json", import.meta.url);
const OUT = new URL("../data/routes.geo.json", import.meta.url);

const routes = JSON.parse(await fs.readFile(ROUTES_IN, "utf8"));
const locations = JSON.parse(await fs.readFile(LOCATIONS, "utf8"));

const PRECISIONS = new Set(["exact", "approx", "guess"]);
const point = (p, what, slug) => {
  if (typeof p?.lat !== "number" || typeof p?.lon !== "number" || !PRECISIONS.has(p.precision)) {
    throw new Error(`data/locations.json: bad ${what} for "${slug}": ${JSON.stringify(p)}`);
  }
  return p;
};

const missing = [];
const guesses = [];
const out = routes.map((route) => {
  const loc = locations[route.slug];
  if (!loc) {
    missing.push(route.slug);
    return { ...route, location: null };
  }
  const wall = point(loc.wall, "wall", route.slug);
  const parking = loc.parking ? point(loc.parking, "parking", route.slug) : null;
  if (wall.precision === "guess" || parking?.precision === "guess" || !parking) guesses.push(route.slug);
  return {
    ...route,
    location: {
      lat: wall.lat,
      lon: wall.lon,
      source: wall.source,
      matchedName: loc.name ?? null,
      precision: wall.precision,
      parking: parking && { lat: parking.lat, lon: parking.lon, precision: parking.precision },
    },
  };
});

const slugs = new Set(routes.map((r) => r.slug));
const stale = Object.keys(locations).filter((s) => !slugs.has(s));
if (stale.length) console.warn(`Entries for unknown slugs (renamed/removed posts?): ${stale.join(", ")}`);
if (guesses.length) {
  console.warn(`${guesses.length} route(s) with unreviewed/missing wall or parking: ${guesses.join(", ")}`);
}
if (missing.length) {
  console.error(`No location for: ${missing.join(", ")}\nRun scripts/03-seed-locations.mjs and review the new entries.`);
  process.exit(1);
}

await fs.writeFile(OUT, JSON.stringify(out, null, 2));
console.log(`Attached ${out.length} locations -> ${OUT.pathname}`);
