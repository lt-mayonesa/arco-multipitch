import type { GearStyle } from "../types";

export type GearBadgeKind = GearStyle | "runout";

export const GEAR_LABEL: Record<GearBadgeKind, string> = {
  bolted: "Bolted",
  trad: "Trad",
  runout: "Runout",
};

export const GEAR_DESCRIPTION: Record<GearBadgeKind, string> = {
  bolted: "Fixed protection is enough: quickdraws + slings.",
  trad: "Alpine style: you must place your own gear.",
  runout: "Bolted, but with big runouts.",
};

export type GearFilter = "any" | "bolted" | "trad";

export const GEAR_FILTERS: { value: GearFilter; label: string }[] = [
  { value: "any", label: "Any" },
  { value: "bolted", label: "Bolted" },
  { value: "trad", label: "Trad" },
];

/** "bolted" includes runout routes; routes with unknown style only match "any". */
export function matchesGearFilter(style: GearStyle | null, filter: GearFilter): boolean {
  return filter === "any" || style === filter;
}
