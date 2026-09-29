// Mirrors scripts/lib/gradeConvert.mjs; kept as a small standalone copy so the app
// bundle doesn't depend on the Node scraping scripts.
const LETTER_ORDER: Record<string, number> = { a: 0, b: 1, c: 2 };

export function frenchGradeToScore(fr: string | null): number | null {
  if (!fr) return null;
  const m = /^(\d+)([abc])(\+)?$/i.exec(fr.trim());
  if (!m) {
    const n = Number(fr);
    return Number.isFinite(n) ? n * 10 : null;
  }
  const [, num, letter, plus] = m;
  return Number(num) * 10 + LETTER_ORDER[letter.toLowerCase()] * 3 + (plus ? 1.5 : 0);
}

// The full ordered French grade scale used for the filter range slider.
export const FRENCH_GRADE_SCALE = [
  "3a", "3b", "3c",
  "4a", "4b", "4c",
  "5a", "5b", "5c",
  "6a", "6a+", "6b", "6b+", "6c",
  "7a", "7a+", "7b", "7b+",
  "7c", "7c+",
  "8a", "8a+", "8b",
];

export function gradeIndex(fr: string | null): number {
  if (!fr) return -1;
  return FRENCH_GRADE_SCALE.indexOf(fr.toLowerCase());
}
