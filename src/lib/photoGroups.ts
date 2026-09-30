import type { Photo, Route } from "../types";

export interface PhotoGroup {
  key: string;
  label: string;
  photos: Photo[];
}

/**
 * Groups a route's photos by the section of the write-up they belong to
 * (see Photo / scripts/lib/photoContext.mjs), in climbing order:
 * Approach -> Pitch 1..N -> After the climb -> (ungrouped).
 */
export function groupPhotosByPitch(route: Route): PhotoGroup[] {
  const { photos, pitches } = route;
  const approach: Photo[] = [];
  const summary: Photo[] = [];
  const unknown: Photo[] = [];
  const byPitch = new Map<number, Photo[]>();

  for (const p of photos) {
    if (p.section === "pitch" && p.pitch != null && pitches[p.pitch - 1]) {
      const list = byPitch.get(p.pitch) ?? [];
      list.push(p);
      byPitch.set(p.pitch, list);
    } else if (p.section === "approach") approach.push(p);
    else if (p.section === "summary") summary.push(p);
    else unknown.push(p);
  }

  const groups: PhotoGroup[] = [];
  if (approach.length) groups.push({ key: "approach", label: "Approach", photos: approach });
  for (const [n, list] of [...byPitch].sort((a, b) => a[0] - b[0])) {
    const pitch = pitches[n - 1];
    groups.push({ key: `pitch-${n}`, label: pitchLabel(n, pitch.gradeFrench ?? pitch.gradeRaw), photos: list });
  }
  if (summary.length) groups.push({ key: "summary", label: "After the climb", photos: summary });
  if (unknown.length) groups.push({ key: "unknown", label: groups.length ? "Other" : "Photos", photos: unknown });
  return groups;
}

export function pitchLabel(n: number, grade: string | null) {
  return grade ? `Pitch ${n} · ${grade}` : `Pitch ${n}`;
}

export function photoCaption(p: Photo): string | null {
  return p.captionEn ?? p.captionIt;
}
