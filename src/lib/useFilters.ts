import { useMemo, useState } from "react";
import type { Route } from "../types";
import { FRENCH_GRADE_SCALE, frenchGradeToScore, gradeIndex } from "./grades";
import { matchesGearFilter, type GearFilter } from "./gear";

export type SortField = "grade" | "length" | "pitches";
export type SortDir = "asc" | "desc";
export interface SortOption {
  field: SortField;
  dir: SortDir;
}

export const SORT_OPTIONS: { key: string; label: string; option: SortOption }[] = [
  { key: "grade-asc", label: "Grade: easiest first", option: { field: "grade", dir: "asc" } },
  { key: "grade-desc", label: "Grade: hardest first", option: { field: "grade", dir: "desc" } },
  { key: "length-asc", label: "Length: shortest first", option: { field: "length", dir: "asc" } },
  { key: "length-desc", label: "Length: longest first", option: { field: "length", dir: "desc" } },
  { key: "pitches-asc", label: "Pitches: fewest first", option: { field: "pitches", dir: "asc" } },
  { key: "pitches-desc", label: "Pitches: most first", option: { field: "pitches", dir: "desc" } },
];

export const DEFAULT_SORT_KEY = "grade-asc";

export interface Filters {
  search: string;
  crags: Set<string>;
  minGradeIdx: number;
  maxGradeIdx: number;
  maxPitches: number | null;
  favoritesOnly: boolean;
  sun: "any" | "sunny" | "shaded";
  gear: GearFilter;
  hideRunout: boolean;
  sortKey: string;
}

export const DEFAULT_FILTERS: Filters = {
  search: "",
  crags: new Set(),
  minGradeIdx: 0,
  maxGradeIdx: FRENCH_GRADE_SCALE.length - 1,
  maxPitches: null,
  favoritesOnly: false,
  sun: "any",
  gear: "any",
  hideRunout: false,
  sortKey: DEFAULT_SORT_KEY,
};

export function useFilters(initial?: Partial<Filters>) {
  const [filters, setFilters] = useState<Filters>(() => ({ ...DEFAULT_FILTERS, ...initial }));

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const toggleCrag = (crag: string) =>
    setFilters((f) => {
      const next = new Set(f.crags);
      if (next.has(crag)) next.delete(crag);
      else next.add(crag);
      return { ...f, crags: next };
    });

  const reset = () => setFilters(DEFAULT_FILTERS);

  return { filters, set, toggleCrag, reset };
}

function sortRoutes(routes: Route[], sortKey: string): Route[] {
  const found = SORT_OPTIONS.find((s) => s.key === sortKey);
  if (!found) return routes;
  const { field, dir } = found.option;
  const mult = dir === "asc" ? 1 : -1;

  const valueOf = (r: Route): number => {
    if (field === "grade") return gradeIndex(r.overallGradeFrench);
    if (field === "length") return r.totalLengthM;
    return r.numPitches;
  };

  return [...routes].sort((a, b) => {
    const va = valueOf(a);
    const vb = valueOf(b);
    // Routes with unknown grade always sort last, regardless of direction.
    if (field === "grade") {
      if (va < 0 && vb < 0) return 0;
      if (va < 0) return 1;
      if (vb < 0) return -1;
    }
    return (va - vb) * mult;
  });
}

/** Filters that always remove a route, from the list and the map. */
function passesHideFilters(r: Route, filters: Filters, search: string, isFavorite: (slug: string) => boolean) {
  if (filters.favoritesOnly && !isFavorite(r.slug)) return false;
  if (filters.crags.size > 0 && !filters.crags.has(r.crag)) return false;
  if (search) {
    const haystack = `${r.title} ${r.crag} ${r.zoneChain.join(" ")}`.toLowerCase();
    if (!haystack.includes(search)) return false;
  }
  return true;
}

/** Filters whose misses can be greyed out on the map instead of hidden. */
function passesGreyFilters(r: Route, filters: Filters) {
  if (filters.maxPitches != null && r.numPitches > filters.maxPitches) return false;
  if (!matchesGearFilter(r.gear.style, filters.gear)) return false;
  if (filters.hideRunout && r.gear.runout) return false;

  const idx = gradeIndex(r.overallGradeFrench);
  if (idx >= 0 && (idx < filters.minGradeIdx || idx > filters.maxGradeIdx)) return false;

  if (filters.sun === "sunny" && r.sunHint.note !== "sunny-mentioned" && r.sunHint.note !== "mixed-mentioned")
    return false;
  if (filters.sun === "shaded" && r.sunHint.note !== "shaded-mentioned" && r.sunHint.note !== "mixed-mentioned")
    return false;

  return true;
}

export function applyFilters(
  routes: Route[],
  filters: Filters,
  isFavorite: (slug: string) => boolean,
): Route[] {
  const search = filters.search.trim().toLowerCase();
  const filtered = routes.filter(
    (r) => passesHideFilters(r, filters, search, isFavorite) && passesGreyFilters(r, filters),
  );
  return sortRoutes(filtered, filters.sortKey);
}

export function useFilteredRoutes(
  routes: Route[],
  filters: Filters,
  isFavorite: (slug: string) => boolean,
) {
  return useMemo(() => applyFilters(routes, filters, isFavorite), [routes, filters, isFavorite]);
}

/**
 * Routes to draw on the map. With `greyOut`, routes that only fail the "grey"
 * filters stay on the map (their slug is missing from `matchSlugs`); otherwise
 * the map shows exactly the list.
 */
export function useMapRoutes(
  routes: Route[],
  filtered: Route[],
  filters: Filters,
  isFavorite: (slug: string) => boolean,
  greyOut: boolean,
) {
  return useMemo(() => {
    const matchSlugs = new Set(filtered.map((r) => r.slug));
    if (!greyOut) return { mapRoutes: filtered, matchSlugs };
    const search = filters.search.trim().toLowerCase();
    const mapRoutes = routes.filter((r) => passesHideFilters(r, filters, search, isFavorite));
    return { mapRoutes, matchSlugs };
  }, [routes, filtered, filters, isFavorite, greyOut]);
}

// re-exported for components that only need score comparisons elsewhere
export { frenchGradeToScore };
