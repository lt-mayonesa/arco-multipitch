import type { Pitch } from "../types";

export interface PhotoGroup {
  label: string;
  photos: string[];
}

/**
 * Best-effort grouping of a route's photos by pitch, without re-scraping the
 * original captions: photos are already stored in the order they appeared in
 * the source post, which roughly follows Approach -> Pitch 1 -> Pitch 2 ->
 * ... -> Summary. We spread them proportionally across that many slots. It's
 * an approximation, not a verified per-pitch match.
 */
export function groupPhotosByPitch(photos: string[], pitches: Pitch[]): PhotoGroup[] {
  if (photos.length === 0) return [];

  const slotLabels: string[] = [
    "Approach",
    ...pitches.map((p) => `Pitch ${p.pitch} · ${p.gradeFrench ?? p.gradeRaw}`),
    "Summary",
  ];

  const groups: PhotoGroup[] = [];
  let lastSlot = -1;
  for (let i = 0; i < photos.length; i++) {
    const slot = Math.min(slotLabels.length - 1, Math.floor((i / photos.length) * slotLabels.length));
    if (slot !== lastSlot) {
      groups.push({ label: slotLabels[slot], photos: [] });
      lastSlot = slot;
    }
    groups[groups.length - 1].photos.push(photos[i]);
  }
  return groups;
}
