import { useState } from "react";
import { allCrags } from "../data/routes";
import { FRENCH_GRADE_SCALE } from "../lib/grades";
import { GEAR_FILTERS } from "../lib/gear";
import type { Filters } from "../lib/useFilters";
import { SortMenu } from "./SortMenu";

interface Props {
  filters: Filters;
  set: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  toggleCrag: (crag: string) => void;
  reset: () => void;
  /** Map display preference (persisted, not counted as a filter). */
  greyOut: boolean;
  onGreyOutChange: (greyOut: boolean) => void;
  resultCount: number;
  /** Called when the user starts searching/filtering, so the sheet can expand. */
  onExpandRequest: () => void;
}

export function FilterBar({
  filters,
  set,
  toggleCrag,
  reset,
  greyOut,
  onGreyOutChange,
  resultCount,
  onExpandRequest,
}: Props) {
  const [open, setOpen] = useState(false);
  const activeCount =
    filters.crags.size +
    (filters.favoritesOnly ? 1 : 0) +
    (filters.sun !== "any" ? 1 : 0) +
    (filters.gear !== "any" ? 1 : 0) +
    (filters.hideRunout ? 1 : 0) +
    (filters.maxPitches != null ? 1 : 0) +
    (filters.minGradeIdx > 0 || filters.maxGradeIdx < FRENCH_GRADE_SCALE.length - 1 ? 1 : 0);

  return (
    <div className="filter-bar">
      <div className="filter-bar__row">
        <input
          className="filter-bar__search"
          type="search"
          placeholder="Search route or crag…"
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          onFocus={onExpandRequest}
          enterKeyHint="search"
        />
        <SortMenu sortKey={filters.sortKey} onChange={(key) => set("sortKey", key)} />
        <button
          className="filter-bar__toggle"
          aria-expanded={open}
          onClick={() => {
            if (!open) onExpandRequest();
            setOpen(!open);
          }}
        >
          Filters{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
      </div>

      {open && (
        <div className="filter-panel" data-sheet-scroll>
          <div className="filter-panel__group">
            <label>
              <input type="checkbox" checked={greyOut} onChange={(e) => onGreyOutChange(e.target.checked)} />{" "}
              Grey out filtered routes on map
            </label>
            <span className="filter-panel__hint">Search, sector and trip list still hide routes.</span>
          </div>

          <div className="filter-panel__group">
            <label>Grade range</label>
            <div className="filter-panel__grade-range">
              <select
                value={filters.minGradeIdx}
                onChange={(e) => set("minGradeIdx", Number(e.target.value))}
              >
                {FRENCH_GRADE_SCALE.map((g, i) => (
                  <option key={g} value={i} disabled={i > filters.maxGradeIdx}>
                    {g}
                  </option>
                ))}
              </select>
              <span>to</span>
              <select
                value={filters.maxGradeIdx}
                onChange={(e) => set("maxGradeIdx", Number(e.target.value))}
              >
                {FRENCH_GRADE_SCALE.map((g, i) => (
                  <option key={g} value={i} disabled={i < filters.minGradeIdx}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="filter-panel__group">
            <label>Max pitches</label>
            <select
              value={filters.maxPitches ?? ""}
              onChange={(e) => set("maxPitches", e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Any</option>
              {[3, 5, 7, 10].map((n) => (
                <option key={n} value={n}>
                  ≤ {n}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-panel__group">
            <label>Protection</label>
            <div className="filter-panel__pills">
              {GEAR_FILTERS.map(({ value, label }) => (
                <button
                  key={value}
                  className={`pill ${filters.gear === value ? "pill--active" : ""}`}
                  onClick={() => set("gear", value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="filter-panel__sub">
              <input
                type="checkbox"
                checked={filters.hideRunout}
                onChange={(e) => set("hideRunout", e.target.checked)}
              />{" "}
              Hide runout routes
            </label>
          </div>

          <div className="filter-panel__group">
            <label>Sun</label>
            <div className="filter-panel__pills">
              {(["any", "sunny", "shaded"] as const).map((s) => (
                <button
                  key={s}
                  className={`pill ${filters.sun === s ? "pill--active" : ""}`}
                  onClick={() => set("sun", s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-panel__group">
            <label>
              <input
                type="checkbox"
                checked={filters.favoritesOnly}
                onChange={(e) => set("favoritesOnly", e.target.checked)}
              />{" "}
              Trip list only
            </label>
          </div>

          <div className="filter-panel__group">
            <label>Crag/sector</label>
            <div className="filter-panel__crags">
              {allCrags.map((crag) => (
                <button
                  key={crag}
                  className={`pill ${filters.crags.has(crag) ? "pill--active" : ""}`}
                  onClick={() => toggleCrag(crag)}
                >
                  {crag}
                </button>
              ))}
            </div>
          </div>

          <button className="filter-panel__reset" onClick={reset}>
            Reset filters
          </button>
        </div>
      )}

      <div className="filter-bar__count">{resultCount} routes</div>
    </div>
  );
}
