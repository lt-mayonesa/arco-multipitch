// Step 3: resolve a lat/lon per route.
// 1) Prefer an exact match against the author's own Google My Maps KML export
//    (data/mymap.kml), matched by the post URL embedded in each placemark's description.
// 2) Otherwise geocode the crag/zone name via OpenStreetMap Nominatim, trying the most
//    specific zone name first and walking up the chain (e.g. "Parete di Pezol" ->
//    "Monte Velo" -> "Valle del Sarca") until a hit is found, with a regional hint to
//    disambiguate (most zones are near Arco/Trento; a couple are elsewhere in Italy).
import fs from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";

const ROUTES_IN = new URL("../data/routes.parsed.json", import.meta.url);
const KML_IN = new URL("../data/mymap.kml", import.meta.url);
const CACHE = new URL("../data/geocode-cache.json", import.meta.url);
const OUT = new URL("../data/routes.geo.json", import.meta.url);

const routes = JSON.parse(await fs.readFile(ROUTES_IN, "utf8"));

// --- 1) KML pins, keyed by source post URL -------------------------------------------
const kmlXml = await fs.readFile(KML_IN, "utf8");
const parser = new XMLParser();
const kml = parser.parse(kmlXml);
const folders = kml.kml.Document.Folder;
const foldersArr = Array.isArray(folders) ? folders : [folders];

const pinsByUrl = new Map();
for (const folder of foldersArr) {
  const placemarks = folder.Placemark;
  if (!placemarks) continue;
  const arr = Array.isArray(placemarks) ? placemarks : [placemarks];
  for (const pm of arr) {
    const desc = typeof pm.description === "string" ? pm.description.trim() : null;
    const coords = pm.Point?.coordinates;
    if (!desc || !coords) continue;
    const [lon, lat] = coords.split(",").map(Number);
    pinsByUrl.set(desc.replace(/\/$/, ""), { lat, lon, source: "mymaps" });
  }
}
console.log(`KML pins with a post URL: ${pinsByUrl.size}`);

// --- 2) Nominatim fallback, per zone name --------------------------------------------
let cache = {};
try {
  cache = JSON.parse(await fs.readFile(CACHE, "utf8"));
} catch {
  /* no cache yet */
}

// Bounding boxes used to sanity-check candidate hits and pick the right query variant
// per zone (most zones sit in the Arco/Sarca valley; a couple are elsewhere in Italy).
const ARCO_BBOX = { minLat: 45.75, maxLat: 46.1, minLon: 10.6, maxLon: 11.1 };
const REGION_HINTS = {
  "Covolo di Butistone": ["Covolo di Butistone, Valsugana, Italy", "Valsugana, Italy"],
  Valsugana: ["Valsugana, Trentino, Italy"],
  "monte baone": ["Monte Baone, Colli Euganei, Italy"],
};

// Manually-sourced coordinates for a handful of zones that OSM/Nominatim doesn't know
// by name (cross-checked against mountainproject.com / thecrag.com crag listings).
const MANUAL_COORDS = {
  "Parete di Padaro": { lat: 45.93731, lon: 10.86861 },
  "Il Transatlantico": { lat: 46.01111, lon: 10.9301 },
  "Pian dela Paia": { lat: 46.01111, lon: 10.9301 },
  "Parete Due Laghi": { lat: 46.026, lon: 10.916 }, // Santa Massenza hydro plant
  "Lo Scudo": { lat: 45.979656, lon: 10.913951 },
  "Spalti dell'Orsa": { lat: 45.65282, lon: 10.86266 }, // OSM cliff "Parete Capitel D'Orsa", Brentino Belluno (VR)
  "monte baone": { lat: 45.925, lon: 10.878 }, // Monte Baone above Arco (not the Colli Euganei one)
  "Parete Rigata": { lat: 45.60294, lon: 10.84111 }, // OSM cliff, Tessari (VR); thetopo.com agrees
  "Ca' di Sopra": { lat: 45.604077, lon: 10.844842 }, // outdooractive.com; matches OSM cliff
  // Both posts under this category are at Roda del Canal (OSM cliff "Roda de Canal").
  "Parete di Tessari": { lat: 45.59449, lon: 10.8363 },
};
function inBbox(lat, lon, bbox) {
  return lat >= bbox.minLat && lat <= bbox.maxLat && lon >= bbox.minLon && lon <= bbox.maxLon;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function nominatimSearch(query) {
  if (cache[query] !== undefined) return cache[query];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "arco-multipitch-scraper/1.0 (personal trip planning tool)" },
  });
  const body = await res.json();
  const hit = body[0] ? { lat: Number(body[0].lat), lon: Number(body[0].lon) } : null;
  cache[query] = hit;
  await sleep(1100); // Nominatim usage policy: max 1 req/sec
  return hit;
}

async function geocodeZoneChain(zoneChain) {
  // zoneChain[0] is always "Multipitch"; try from most specific to least specific.
  const names = zoneChain.slice(1).reverse();
  for (const name of names) {
    if (MANUAL_COORDS[name]) {
      return { ...MANUAL_COORDS[name], source: "manual", matchedName: name };
    }
  }
  const isSpecialRegion = names.some((n) => REGION_HINTS[n]);
  for (const name of names) {
    const variants = REGION_HINTS[name] ?? [name, `${name}, Italy`];
    for (const query of variants) {
      const hit = await nominatimSearch(query);
      if (!hit) continue;
      if (!isSpecialRegion && !inBbox(hit.lat, hit.lon, ARCO_BBOX)) continue; // likely wrong place
      return { ...hit, source: "nominatim", matchedName: name, query };
    }
  }
  // Last resort: put the pin at the Arco town center so it's at least in the right valley.
  const hit = await nominatimSearch("Arco, Trento, Trentino, Italy");
  return hit ? { ...hit, source: "nominatim-fallback", matchedName: null } : null;
}

const geoRoutes = [];
let kmlHits = 0;
let geocoded = 0;
let missed = 0;

for (const route of routes) {
  const pin = pinsByUrl.get(route.sourceUrl.replace(/\/$/, ""));
  let location;
  if (pin) {
    location = pin;
    kmlHits++;
  } else {
    location = await geocodeZoneChain(route.zoneChain);
    if (location) geocoded++;
    else missed++;
  }
  geoRoutes.push({ ...route, location });
  await fs.writeFile(CACHE, JSON.stringify(cache, null, 2)); // save progress as we go
}

console.log(`KML exact hits: ${kmlHits}, geocoded via Nominatim: ${geocoded}, missed: ${missed}`);
await fs.writeFile(OUT, JSON.stringify(geoRoutes, null, 2));
console.log(`Wrote ${OUT.pathname}`);
