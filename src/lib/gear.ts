import type { GearLevel } from "../types";

export const GEAR_LABEL: Record<GearLevel, string> = {
  bolted: "Bolted",
  runout: "Runout",
  trad: "Trad",
};

export const GEAR_DESCRIPTION: Record<GearLevel, string> = {
  bolted: "Fixed protection is enough: quickdraws + slings.",
  runout: "Mostly fixed protection, but with big runouts.",
  trad: "Alpine style: you must place your own gear.",
};

export type GearFilter = "any" | "no-trad" | "bolted" | "trad";

export const GEAR_FILTERS: { value: GearFilter; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "no-trad", label: "No trad" },
  { value: "bolted", label: "Bolted only" },
  { value: "trad", label: "Trad only" },
];

/** Routes with unknown protection (level null) only match "any" and "no-trad". */
export function matchesGearFilter(level: GearLevel | null, filter: GearFilter): boolean {
  if (filter === "no-trad") return level !== "trad";
  if (filter === "bolted") return level === "bolted";
  if (filter === "trad") return level === "trad";
  return true;
}
