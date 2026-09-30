// Step 3 (only needed when new posts appear): add a *guessed* location for every parsed route
// that has no entry in the curated data/locations.json yet. Existing entries are never
// touched. Guesses are marked precision "guess" and must be reviewed by hand (wall +
// parking, see the header of 03b-apply-locations.mjs) before 03b will run cleanly.
//
// Guess order:
// 1) the author's Google My Maps KML export (data/mymap.kml), matched by the post URL in
//    each placemark's description (the map stops at ~2021, so most posts miss);
// 2) an existing curated entry for the same wall/sector (most specific zoneChain name);
// 3) OpenStreetMap Nominatim, most specific zone name first, walking up the chain;
// 4) Arco town centre.
import fs from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

const ROUTES_IN = new URL("../data/routes.parsed.json", import.meta.url);
const KML_IN = new URL("../data/mymap.kml", import.meta.url);
const CACHE = new URL("../data/geocode-cache.json", import.meta.url);
const LOCATIONS = new URL("../data/locations.json", import.meta.url);

const routes = JSON.parse(await fs.readFile(ROUTES_IN, "utf8"));
const locations = JSON.parse(await fs.readFile(LOCATIONS, "utf8").catch(() => "{}"));

// --- 1) KML pins, keyed by source post URL -------------------------------------------
const pinsByUrl = new Map();
try {
  const kml = new XMLParser().parse(await fs.readFile(KML_IN, "utf8"));
  for (const folder of [kml.kml.Document.Folder].flat()) {
    for (const pm of [folder.Placemark ?? []].flat()) {
      const desc = typeof pm.description === "string" ? pm.description.trim() : null;
      const coords = pm.Point?.coordinates;
      if (!desc || !coords) continue;
      const [lon, lat] = coords.split(",").map(Number);
      pinsByUrl.set(desc.replace(/\/$/, ""), { lat, lon, name: String(pm.name).trim() });
    }
  }
} catch {
  console.warn("No data/mymap.kml; download it from the My Maps link in the README for better guesses.");
}

// --- 2) Curated entries by wall name ---------------------------------------------------
const curatedByName = new Map();
for (const loc of Object.values(locations)) {
  if (loc.name && loc.wall.precision !== "guess") curatedByName.set(loc.name, loc);
}

// --- 3) Nominatim ------------------------------------------------------------------------
let cache = {};
try {
  cache = JSON.parse(await fs.readFile(CACHE, "utf8"));
} catch {
  /* no cache yet */
}

// Sanity-check hits (most zones sit in the Arco/Sarca valley; a couple are elsewhere).
const ARCO_BBOX = { minLat: 45.55, maxLat: 46.1, minLon: 10.6, maxLon: 11.1 };
const REGION_HINTS = {
  "Covolo di Butistone": ["Covolo di Butistone, Valsugana, Italy", "Valsugana, Italy"],
  Valsugana: ["Valsugana, Trentino, Italy"],
};
const inBbox = (lat, lon, b) => lat >= b.minLat && lat <= b.maxLat && lon >= b.minLon && lon <= b.maxLon;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function nominatimSearch(query) {
  if (cache[query] !== undefined) return cache[query];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "arco-multipitch-scraper/1.0 (personal trip planning tool)" },
  });
  const body = await res.json();
  const hit = body[0] ? { lat: Number(body[0].lat), lon: Number(body[0].lon) } : null;
  cache[query] = hit;
  await fs.writeFile(CACHE, JSON.stringify(cache, null, 2));
  await sleep(1100); // Nominatim usage policy: max 1 req/sec
  return hit;
}

async function guess(route) {
  const names = route.zoneChain.slice(1).reverse(); // [0] is always "Multipitch"
  const pin = pinsByUrl.get(route.sourceUrl.replace(/\/$/, ""));
  if (pin) return { name: names[0], lat: pin.lat, lon: pin.lon, source: `mymaps: ${pin.name}` };
  for (const name of names) {
    const c = curatedByName.get(name);
    if (c) return { name, lat: c.wall.lat, lon: c.wall.lon, source: `same wall as curated "${name}"`, parking: c.parking };
  }
  const special = names.some((n) => REGION_HINTS[n]);
  for (const name of names) {
    for (const query of REGION_HINTS[name] ?? [name, `${name}, Italy`]) {
      const hit = await nominatimSearch(query);
      if (hit && (special || inBbox(hit.lat, hit.lon, ARCO_BBOX))) {
        return { name: names[0], ...hit, source: `nominatim: ${query}${name === names[0] ? "" : " (parent zone!)"}` };
      }
    }
  }
  const hit = await nominatimSearch("Arco, Trento, Trentino, Italy");
  return { name: names[0], ...hit, source: "nominatim: Arco town centre (no match!)" };
}

let added = 0;
for (const route of routes) {
  if (locations[route.slug]) continue;
  const g = await guess(route);
  locations[route.slug] = {
    name: g.name,
    wall: { lat: g.lat, lon: g.lon, precision: "guess", source: g.source },
    parking: g.parking ? { ...g.parking, precision: "guess" } : null,
    note: `NEW: review wall + parking. ${route.sourceUrl}`,
  };
  console.log(`+ ${route.slug}: ${g.source}`);
  added++;
}

const sorted = Object.fromEntries(Object.entries(locations).sort(([a], [b]) => a.localeCompare(b)));
await fs.writeFile(LOCATIONS, JSON.stringify(sorted, null, 2) + "\n");
console.log(`Added ${added} guessed location(s) to ${LOCATIONS.pathname}`);
