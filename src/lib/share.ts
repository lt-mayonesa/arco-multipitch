import type { Route } from "../types";
import { routeHash } from "./useHashRoute";
import { tripSearch } from "./tripCode";

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

function appUrl(suffix: string): string {
  return new URL(`${import.meta.env.BASE_URL}${suffix}`, window.location.origin).href;
}

/** Deep link that opens the app on this route. */
export function routeUrl(route: Route): string {
  return appUrl(routeHash(route.slug));
}

/** "6b+ · 8 pitches"-style summary parts, without empty values. */
function details(route: Route, short: boolean): string[] {
  return [
    route.overallGradeFrench ?? route.overallGradeRaw,
    short ? `${route.numPitches}p` : `${route.numPitches} pitches`,
    short && route.totalLengthM ? `${route.totalLengthM}m` : null,
  ].filter((s): s is string => !!s);
}

export function shareRoute(route: Route): Promise<ShareResult> {
  const crag = route.zoneChain.filter((z) => z !== "Multipitch").at(-1);
  const text = [route.title, ...details(route, false), crag].filter(Boolean).join(" · ");
  return share({ title: route.title, text, url: routeUrl(route) }, false);
}

/**
 * Share a trip list: one line per route plus a link that opens the app on
 * the trip (`?trip=<code>`). The clipboard fallback copies text + link.
 */
export function shareTrip(trip: Route[]): Promise<ShareResult> {
  const title = `Arco trip · ${trip.length} route${trip.length === 1 ? "" : "s"}`;
  const lines = trip.map((r) => `• ${r.title} — ${[...details(r, true), r.crag].join(" · ")}`);
  const url = appUrl(tripSearch(trip.map((r) => r.slug)));
  return share({ title, text: [title, ...lines].join("\n"), url }, true);
}

/**
 * Native share sheet when available (phones), otherwise copy to the
 * clipboard (the URL, or text + URL with `copyWithText`). The caller shows
 * feedback for "copied" / "failed".
 */
async function share(data: { title: string; text: string; url: string }, copyWithText: boolean): Promise<ShareResult> {
  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return "cancelled";
      // Other errors (e.g. NotAllowedError): fall back to copying.
    }
  }
  const copy = copyWithText ? `${data.text}\n\n${data.url}` : data.url;
  return (await copyText(copy)) ? "copied" : "failed";
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers / non-secure contexts.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
