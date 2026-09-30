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

export interface Location {
  lat: number;
  lon: number;
  source: "mymaps" | "nominatim" | "nominatim-fallback" | "manual";
  matchedName?: string | null;
  query?: string;
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
  location: Location | null;
  photos: Photo[];
}
