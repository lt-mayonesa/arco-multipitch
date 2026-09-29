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
  photos: string[];
}
