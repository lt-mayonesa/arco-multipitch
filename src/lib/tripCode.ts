import { routes } from "../data/routes";

/**
 * Compact, reversible trip code: one bit per route, routes ordered by their
 * WordPress post id (ascending), packed LSB-first into bytes, base64url.
 * 69 routes -> at most 12 chars, whatever the list size.
 *
 * New posts get higher ids, so adding routes keeps old codes valid. Removing
 * a route from the dataset shifts later bits and breaks old codes.
 */
export const TRIP_PARAM = "trip";

const ORDER: string[] = [...routes].sort((a, b) => a.id - b.id).map((r) => r.slug);
const INDEX = new Map(ORDER.map((slug, i) => [slug, i]));

export function encodeTrip(slugs: Iterable<string>): string {
  const bytes = new Uint8Array(Math.ceil(ORDER.length / 8));
  for (const slug of slugs) {
    const i = INDEX.get(slug);
    if (i != null) bytes[i >> 3] |= 1 << (i & 7);
  }
  let end = bytes.length;
  while (end > 0 && bytes[end - 1] === 0) end--;
  const bin = String.fromCharCode(...bytes.subarray(0, end));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Slugs in the code, in post-id order. Invalid input decodes to []. */
export function decodeTrip(code: string): string[] {
  let bin: string;
  try {
    bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
  } catch {
    return [];
  }
  const out: string[] = [];
  for (let i = 0; i < ORDER.length && i >> 3 < bin.length; i++) {
    if (bin.charCodeAt(i >> 3) & (1 << (i & 7))) out.push(ORDER[i]);
  }
  return out;
}

/** `?trip=<code>` query string for a list (the param stays, even when empty). */
export function tripSearch(slugs: Iterable<string> | null): string {
  return slugs ? `?${TRIP_PARAM}=${encodeTrip(slugs)}` : "";
}
