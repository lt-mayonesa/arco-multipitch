import { useEffect, useState } from "react";

const KEY = "arco-multipitch:map-grey-out";

/** Display preference: grey out filtered-out routes on the map instead of hiding them. */
export function useMapGreyOut() {
  const [greyOut, setGreyOut] = useState<boolean>(() => {
    try {
      return localStorage.getItem(KEY) !== "false";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(KEY, String(greyOut));
    } catch {
      /* private mode etc.: preference just won't persist */
    }
  }, [greyOut]);

  return [greyOut, setGreyOut] as const;
}
