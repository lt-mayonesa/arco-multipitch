import raw from "./routes.json";
import type { Route } from "../types";

export const routes: Route[] = raw as Route[];

export const allCrags = [...new Set(routes.map((r) => r.crag))].sort((a, b) =>
  a.localeCompare(b),
);

export const allZones = [
  ...new Set(routes.map((r) => r.zoneChain[1] ?? r.crag).filter(Boolean)),
].sort((a, b) => a.localeCompare(b));

export function routeBySlug(slug: string): Route | undefined {
  return routes.find((r) => r.slug === slug);
}
