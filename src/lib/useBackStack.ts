import { useEffect, useRef, useState } from "react";

/**
 * Makes the browser/Android back button step out of transient UI state
 * (route detail open, sheet fully expanded) instead of leaving the app.
 *
 * While `active`, exactly one "guard" history entry sits above the base
 * entry; its URL is `base + hash`. Pressing back pops to the base entry and
 * calls `onBack`; if the app is still in a non-root state afterwards a new
 * guard is pushed. When the app leaves the non-root state through the UI,
 * the guard is consumed with `history.back()`.
 */
export function useBackStack(active: boolean, hash: string, onBack: () => void) {
  const onBackRef = useRef(onBack);
  useEffect(() => {
    onBackRef.current = onBack;
  });

  const baseUrl = useRef(window.location.pathname + window.location.search);
  const pushed = useRef(false);
  const ignorePops = useRef(0);
  const [tick, setTick] = useState(0);

  // Normalise the entry we start on to the bare base URL (a deep link like
  // #/route/x then gets a real "list" entry to go back to).
  useEffect(() => {
    history.replaceState({ arcoBase: true }, "", baseUrl.current);
  }, []);

  useEffect(() => {
    const url = baseUrl.current + hash;
    if (active && !pushed.current) {
      history.pushState({ arcoGuard: true }, "", url);
      pushed.current = true;
    } else if (active) {
      history.replaceState({ arcoGuard: true }, "", url);
    } else if (pushed.current) {
      pushed.current = false;
      ignorePops.current++;
      history.back();
    }
  }, [active, hash, tick]);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      if (ignorePops.current > 0) {
        ignorePops.current--;
        return;
      }
      if (e.state?.arcoGuard) {
        // Forward button onto a stale guard: let the effect reconcile.
        pushed.current = true;
      } else {
        pushed.current = false;
        onBackRef.current();
      }
      setTick((t) => t + 1);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
}
