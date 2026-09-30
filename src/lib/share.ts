import type { Route } from "../types";
import { routeHash } from "./useHashRoute";

export type ShareResult = "shared" | "copied" | "cancelled" | "failed";

/** Deep link that opens the app on this route. */
export function routeUrl(route: Route): string {
  return new URL(`${import.meta.env.BASE_URL}${routeHash(route.slug)}`, window.location.origin).href;
}

/**
 * Native share sheet when available (phones), otherwise copy the deep link
 * to the clipboard. The caller shows feedback for "copied" / "failed".
 */
export async function shareRoute(route: Route): Promise<ShareResult> {
  const url = routeUrl(route);
  const crag = route.zoneChain.filter((z) => z !== "Multipitch").at(-1);
  const summary = [
    route.title,
    route.overallGradeFrench,
    `${route.numPitches} pitches`,
    crag,
  ]
    .filter(Boolean)
    .join(" · ");
  const data: ShareData = { title: route.title, text: summary, url };

  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (e) {
      if ((e as DOMException).name === "AbortError") return "cancelled";
      // Other errors (e.g. NotAllowedError): fall back to copying.
    }
  }
  return (await copyText(url)) ? "copied" : "failed";
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
