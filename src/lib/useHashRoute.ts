import { useCallback, useEffect, useState } from "react";

// Minimal hash-based "router": #/route/<slug> opens a route detail overlay,
// anything else (including empty) is the list/map screen. Kept intentionally tiny
// to avoid pulling in a routing library for a handful of screens.
function parse(hash: string): string | null {
  const m = /^#\/route\/(.+)$/.exec(hash);
  return m ? decodeURIComponent(m[1]) : null;
}

export function useHashRoute() {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(() =>
    parse(window.location.hash),
  );

  useEffect(() => {
    const onHashChange = () => setSelectedSlug(parse(window.location.hash));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const openRoute = useCallback((slug: string) => {
    window.location.hash = `#/route/${encodeURIComponent(slug)}`;
  }, []);

  const closeRoute = useCallback(() => {
    if (window.location.hash) {
      history.pushState(null, "", window.location.pathname + window.location.search);
      setSelectedSlug(null);
    }
  }, []);

  return { selectedSlug, openRoute, closeRoute };
}
