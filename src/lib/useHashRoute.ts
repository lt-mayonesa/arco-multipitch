import { useCallback, useState } from "react";

// Minimal "router": #/route/<slug> selects a route. The hash is read once on
// load (deep links); afterwards selection lives in React state and the URL is
// kept in sync by useBackStack (which also owns back-button behaviour).
// Kept intentionally tiny to avoid pulling in a routing library.
function parse(hash: string): string | null {
  const m = /^#\/route\/(.+)$/.exec(hash);
  return m ? decodeURIComponent(m[1]) : null;
}

export function routeHash(slug: string | null): string {
  return slug ? `#/route/${encodeURIComponent(slug)}` : "";
}

export function useHashRoute() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(() =>
    parse(window.location.hash),
  );
  const openRoute = useCallback((slug: string) => setSelectedSlug(slug), []);
  const closeRoute = useCallback(() => setSelectedSlug(null), []);
  return { selectedSlug, openRoute, closeRoute };
}
