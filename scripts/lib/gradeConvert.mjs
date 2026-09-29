// Approximate UIAA (Roman numeral, as used on Italian topo descriptions) -> French sport grade table.
// This is a widely-used approximate conversion; exact equivalence varies by route/style.
const TABLE = [
  ["I", "1"],
  ["II", "2"],
  ["III-", "3a"],
  ["III", "3b"],
  ["III+", "3c"],
  ["IV-", "4a"],
  ["IV", "4b"],
  ["IV+", "4c"],
  ["V-", "5a"],
  ["V", "5b"],
  ["V+", "5c"],
  ["VI-", "6a"],
  ["VI", "6a+"],
  ["VI+", "6b"],
  ["VII-", "6b+"],
  ["VII", "6c"],
  ["VII+", "7a"],
  ["VIII-", "7a+"],
  ["VIII", "7b"],
  ["VIII+", "7b+"],
  ["IX-", "7c"],
  ["IX", "7c+"],
  ["IX+", "8a"],
  ["X-", "8a+"],
  ["X", "8b"],
];

const UIAA_TO_FRENCH = new Map(TABLE.map(([uiaa, fr]) => [uiaa, fr]));

const FRENCH_RE = /^[3-9][abc]\+?$/i;
const UIAA_RE = /^[IVX]+[+-]?$/i;

/** Normalize a raw grade token (e.g. "IV+", "5c", "6a+") to a canonical French grade string. */
export function toFrenchGrade(raw) {
  if (!raw) return null;
  const g = raw.trim();
  if (FRENCH_RE.test(g)) return g.toLowerCase();
  if (UIAA_RE.test(g.toUpperCase())) {
    const key = g.toUpperCase();
    return UIAA_TO_FRENCH.get(key) ?? null;
  }
  return null;
}

// Ordering helpers: convert a french grade into a sortable numeric value.
const LETTER_ORDER = { a: 0, b: 1, c: 2 };
export function frenchGradeToScore(fr) {
  if (!fr) return null;
  const m = /^(\d+)([abc])(\+)?$/i.exec(fr.trim());
  if (!m) {
    // plain number like "1".."4" (UIAA low grades before letters existed)
    const n = Number(fr);
    return Number.isFinite(n) ? n * 10 : null;
  }
  const [, num, letter, plus] = m;
  return Number(num) * 10 + LETTER_ORDER[letter.toLowerCase()] * 3 + (plus ? 1.5 : 0);
}

export function originalGradeSystem(raw) {
  if (!raw) return "unknown";
  const g = raw.trim();
  if (FRENCH_RE.test(g)) return "french";
  if (UIAA_RE.test(g.toUpperCase())) return "uiaa";
  return "unknown";
}
