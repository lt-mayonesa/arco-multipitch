import { useEffect, useState } from "react";

/** Short-lived status message; `show(text)` replaces any current one. */
export function useToast(durationMs = 2200) {
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(() => setMessage(null), durationMs);
    return () => window.clearTimeout(t);
  }, [message, durationMs]);
  return { message, show: setMessage };
}
