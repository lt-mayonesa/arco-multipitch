import { useCallback, useEffect, useMemo, useState } from "react";
import { decodeTrip, TRIP_PARAM, tripSearch } from "./tripCode";

const KEY = "arco-multipitch:favorites";

function loadPersonal(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function readCode(): string | null {
  return new URLSearchParams(window.location.search).get(TRIP_PARAM);
}

/**
 * The active trip list. Normally the personal list (localStorage). When the
 * app is opened with `?trip=<code>` it works on that shared trip instead:
 * starring edits the shared trip (never the personal list) and `search`
 * follows its content, so the URL always holds the current trip.
 */
export function useTripList() {
  const [shared, setShared] = useState<string[] | null>(() => {
    const code = readCode();
    return code == null ? null : decodeTrip(code);
  });
  const [personal, setPersonal] = useState<string[]>(loadPersonal);

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(personal));
  }, [personal]);

  // Arrays keep insertion order (used for the share text).
  const isShared = shared != null;
  const list = shared ?? personal;
  const favorites = useMemo(() => new Set(list), [list]);

  const toggle = useCallback(
    (slug: string) => {
      const flip = (prev: string[]) => (prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]);
      if (isShared) setShared((prev) => flip(prev ?? []));
      else setPersonal(flip);
    },
    [isShared],
  );

  const isFavorite = useCallback((slug: string) => favorites.has(slug), [favorites]);
  const leaveShared = useCallback(() => setShared(null), []);

  return {
    /** Slugs in insertion order. */
    list,
    favorites,
    toggle,
    isFavorite,
    isShared,
    leaveShared,
    search: tripSearch(shared),
  };
}
