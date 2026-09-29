import { useMemo, useState } from "react";
import type { Route } from "../types";
import { FRENCH_GRADE_SCALE, gradeIndex } from "./grades";

export interface Filters {
  search: string;
  crags: Set<string>;
  minGradeIdx: number;
  maxGradeIdx: number;
  maxPitches: number | null;
  favoritesOnly: boolean;
  sun: "any" | "sunny" | "shaded";
}

export const DEFAULT_FILTERS: Filters = {
  search: "",
  crags: new Set(),
  minGradeIdx: 0,
  maxGradeIdx: FRENCH_GRADE_SCALE.length - 1,
  maxPitches: null,
  favoritesOnly: false,
  sun: "any",
};

export function useFilters() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

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

export function applyFilters(
  routes: Route[],
  filters: Filters,
  isFavorite: (slug: string) => boolean,
): Route[] {
  const search = filters.search.trim().toLowerCase();
  return routes.filter((r) => {
    if (filters.favoritesOnly && !isFavorite(r.slug)) return false;
    if (filters.crags.size > 0 && !filters.crags.has(r.crag)) return false;
    if (filters.maxPitches != null && r.numPitches > filters.maxPitches) return false;

    if (search) {
      const haystack = `${r.title} ${r.crag} ${r.zoneChain.join(" ")}`.toLowerCase();
      if (!haystack.includes(search)) return false;
    }

    const idx = gradeIndex(r.overallGradeFrench);
    if (idx >= 0 && (idx < filters.minGradeIdx || idx > filters.maxGradeIdx)) return false;

    if (filters.sun === "sunny" && r.sunHint.note !== "sunny-mentioned" && r.sunHint.note !== "mixed-mentioned")
      return false;
    if (filters.sun === "shaded" && r.sunHint.note !== "shaded-mentioned" && r.sunHint.note !== "mixed-mentioned")
      return false;

    return true;
  });
}

export function useFilteredRoutes(
  routes: Route[],
  filters: Filters,
  isFavorite: (slug: string) => boolean,
) {
  return useMemo(() => applyFilters(routes, filters, isFavorite), [routes, filters, isFavorite]);
}
