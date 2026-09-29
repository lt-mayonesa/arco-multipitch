import { useCallback, useEffect, useState } from "react";

const KEY = "arco-multipitch:favorites";

function load(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => load());

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify([...favorites]));
  }, [favorites]);

  const toggle = useCallback((slug: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const isFavorite = useCallback((slug: string) => favorites.has(slug), [favorites]);

  return { favorites, toggle, isFavorite };
}
