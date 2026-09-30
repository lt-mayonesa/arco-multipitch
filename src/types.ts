export interface Pitch {
  pitch: number;
  lengthM: number | null;
  gradeRaw: string;
  gradeSystem: "french" | "uiaa" | "unknown";
  gradeFrench: string | null;
}

export interface SunHint {
  orientation: "nord" | "sud" | "est" | "ovest" | null;
  note: "sunny-mentioned" | "shaded-mentioned" | "mixed-mentioned" | null;
}

/**
 * Protection, curated per route in scripts/lib/gearStyle.mjs.
 * style: bolted = fixed gear is enough; trad = you must place your own gear;
 * null = write-up doesn't say. runout: bolted route with a big runout
 * (always false for trad).
 */
export type GearStyle = "bolted" | "trad";

export interface Gear {
  style: GearStyle | null;
  runout: boolean;
  /** Short English paraphrase of the author's protection notes. */
  note: string | null;
  /** "heuristic" = keyword guess for a post not yet curated. */
  source: "curated" | "heuristic";
}

/**
 * "exact": pinned from a named map feature / published coordinates;
 * "approx": estimated from descriptions; "guess": unreviewed automatic guess.
 */
export type LocationPrecision = "exact" | "approx" | "guess";

/** Curated per route in data/locations.json (see scripts/03b-apply-locations.mjs). */
export interface Location {
  /** Base of the route (or the wall when the start isn't pinned). */
  lat: number;
  lon: number;
  /** Provenance of the wall point, free text. */
  source: string;
  /** Wall / sector the point refers to. */
  matchedName: string | null;
  precision: LocationPrecision;
  /** Where the approach starts. */
  parking: { lat: number; lon: number; precision: LocationPrecision } | null;
}

/**
 * Where in the write-up a photo sits. Recovered from the source HTML by
 * scripts/lib/photoContext.mjs: the pitch paragraph it follows, corrected by
 * its caption when that names a pitch ("terzo tiro", "S7", "ultima lunghezza").
 * "unknown" = route has no real per-pitch paragraphs (approximateData).
 */
export type PhotoSection = "approach" | "pitch" | "summary" | "unknown";

export interface Photo {
  src: string;
  section: PhotoSection;
  /** 1-based index into Route.pitches when section === "pitch". */
  pitch: number | null;
  captionIt: string | null;
  captionEn: string | null;
}

export interface Route {
  id: number;
  slug: string;
  title: string;
  sourceUrl: string;
  date: string;
  crag: string;
  zoneChain: string[];
  introIt: string;
  outroIt: string;
  introEn: string;
  outroEn: string;
  pitches: Pitch[];
  numPitches: number;
  totalLengthM: number;
  overallGradeFrench: string | null;
  overallGradeRaw: string | null;
  approximateData: boolean;
  sunHint: SunHint;
  gear: Gear;
  location: Location | null;
  photos: Photo[];
}
