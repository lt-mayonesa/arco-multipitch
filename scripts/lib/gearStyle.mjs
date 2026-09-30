// Protection per route: style "bolted" | "trad" (null = write-up says nothing),
// plus a `runout` flag that only decorates bolted routes.
//
// The source posts never have a structured gear section (see
// design/gear-mentions.noqa.md): protection style is scattered free text, and
// keyword counts are misleading ("non è necessario integrare" vs "è necessario
// integrare"). So the classification is curated by hand from each post's gear
// sentences, with a short English note paraphrasing the author. A keyword
// heuristic only covers posts added after this table was written, and warns.
//
// Table values:
//   bolted  fixed protection (bolts, or pitons/threaded slings on older lines)
//           is enough; quickdraws + slings. An optional cam may be mentioned.
//   runout  shorthand for bolted + runout: mostly fixed protection, but the
//           author flags a big runout (spaced or missing bolts, sometimes backed
//           up with a cam, sometimes not protectable at all).
//   trad    alpine style: you must place your own gear (cams/nuts/slings) on
//           several stretches or whole pitches. Never flagged runout.

/** @type {Record<string, ["bolted" | "runout" | "trad" | null, string | null]>} */
const CURATED = {
  "cercando-la-trincea": ["runout", "Well protected overall, but bolts are sometimes spaced; easy to back up with gear if you want."],
  "ciao-rita": ["bolted", "Generous, close protection. A cam can back up one exit move."],
  attraversate: ["runout", "Good bolting but spaced in places; place a cam in the crack on one pitch to protect the second."],
  eliseo: ["runout", "Dated, sometimes spaced bolting. The last 8 m of one pitch and a slab are unprotected: bring cams."],
  sofia: ["trad", "Alpine-style line: fixed gear exists but you must place cams in many spots."],
  "davide-pinamonti": ["trad", "Decent bolting, but the cracks (esp. the last pitch) have no fixed gear and need cams."],
  "luna-85": ["runout", "Friction slab with very spaced bolts throughout. Even the easy grades are serious."],
  archai: ["trad", "Spaced fixed gear, often needs cams and nuts. Some sections can't be protected at all."],
  "poison-ivy": ["trad", "Alpine-style, spaced protection: you need to place gear."],
  castagnarte: ["runout", "Spaced slings/bolts on poor rock. A pair of cams helps aid the crux; one belay is built on a tree or threads."],
  "lombra-e-lapparizione-del-mondo": ["trad", "Protection only just adequate, often needs backing up. The chimney is sparse and hard to protect."],
  ernia: ["bolted", "Bolted; a bit spaced in places."],
  "favola-ledrense": ["bolted", "Generally safe bolting, a few spots need commitment."],
  "jean-jean": ["runout", "One vegetated section with spaced protection is dangerous; otherwise well bolted."],
  "luce-e-colori": ["trad", "Alpine style: fixed gear is often far apart and needs constant backing up."],
  esculapio: ["trad", "Alpine style: sections with only slings; protect cracks and the chimney with cams."],
  "spigolo-del-vento": ["trad", "Spaced fixed gear; place nuts and cams in the cracks."],
  "ne-vale-la-pena": ["trad", "Half alpine: easy pitches have pitons or nothing (one fully unprotected), bolts only on the hard moves. Bring nuts, cams, slings."],
  "bella-gioia": ["runout", "Mostly threads and bolts; on the first pitch protection thins out and you sling boulders/trees."],
  aquarius: ["trad", "Alpine style with pitons and slings; some sections unprotected, take cams."],
  "pirata-samu": ["runout", "Some bolting is dicey; a few cams help (e.g. first bolt high above a ledge)."],
  "datti-una-mossa": ["runout", "Very good bolting on the hard part, then spaced on broken rock: a cam is advisable."],
  "guide-alpine": ["runout", "Abundant threads and bolts, but one ramp is completely unprotected: bring cams."],
  "claudia-22": ["runout", "Abundant protection; only pitch 2 is spaced, where a pair of small-medium cams helps."],
  "premiata-forneria-pfitscher": [null, null],
  "la-piccola-verticalita": ["trad", "Crux pitches are well protected; the rest needs nuts and cams."],
  "bella-e-cattiva": [null, null],
  "sol-minore": ["bolted", "Good, close bolting."],
  "sulle-pance-del-pezol": ["runout", "Abundant slings on threads, but some sit high on the traverse and a slab has none; cams help protect the second."],
  "cuore-doro": ["runout", "Mostly slings on threads; one section is scarce. Bring a few small-medium cams."],
  "rampa-centrale": ["trad", "Fixed gear is never enough; whole pitches need cams. Bring 2 sets of medium-large cams plus nuts."],
  "fruit-vegetables": ["bolted", "Bolted; bolts are dated, check them (and the belays)."],
  babilonia: ["bolted", "Well bolted slab."],
  "via-del-dottore": ["runout", "Plenty of pitons and slings, but one corner has no fixed gear: protect it with cams (small cam useful)."],
  giubileo: ["trad", "Fixed gear is rare and spaced: nuts and cams are essential. Double the medium cams."],
  plaisir: ["runout", "Good bolting but long in places; back it up with slings on threads."],
  "il-gran-diedro": ["trad", "Alpine style: some pitches have to be protected entirely; runout slab not always protectable."],
  "la-piccola-piramide": ["runout", "Spaced bolts that can't be backed up on pitch 1; a chimney with no gear. Sling bushes and threads."],
  "il-cammino-dellarco": ["runout", "Some stretches have no visible protection; the rest is well protected. For experienced climbers."],
  linquisitore: ["trad", "Hard sections are well protected; the rest needs gear that isn't always easy to place. Unprotected traverse."],
  "ghiro-in-tondo": ["bolted", "Good protection; the authors rarely felt the need to add gear."],
  "via-dellincontro-superiore": ["runout", "Sparse on easy sections (easy to back up), very good on the hard ones."],
  "via-dellincontro": ["trad", "Clearly alpine style: rare, distant protection; place cams in flakes and cracks."],
  "via-dante-dassati": ["runout", "Good bolting, spaced in a few spots where you need to add gear."],
  "vecchi-disonesti-e-insoddisfatti": ["bolted", "Very close bolting."],
  apollo: ["trad", "Bolts only where nothing else goes; corners and cracks are left clean on purpose. Bring medium-large cams."],
  "molla-tutto": ["bolted", "Excellent, close bolting."],
  "via-della-rampa-2": ["trad", "Needs alpine experience: unprotected slab and corners to protect with cams."],
  "di-tutto-un-po": ["runout", "Easy pitches are lightly protected; back up with slings on threads and trees."],
  "il-profondo-risetto-dellindria": ["trad", "Clearly alpine style: sparse protection, whole sections to protect with medium cams."],
  "esclusivamente-per-tutti": ["bolted", "Very close, safe bolting; hard sections can be aided."],
  "anche-le-donne-vogliono-arrampicare": ["trad", "Alpine route with sport sections. Spaced in places; a pair of medium-large cams is essential for an unprotected flake."],
  "le-scalette-dellindria": ["runout", "Plenty of slings on threads; one delicate move is unprotected (only huge cams fit)."],
  "via-della-rondine": ["bolted", "Recently re-bolted; no extra gear needed beyond a few slings."],
  "diedro-rosso": ["runout", "Mix of bolts and threads with alpine sections; one easy pitch is sparse."],
  "passi-falsi": ["bolted", "Pitch 1 is alpine-style scrambling; after that, many bolts on the slabs."],
  karlovacko: ["bolted", "Excellent, close bolting."],
  "nonni-sprint": ["bolted", "Old pitons and slings, often hard to spot."],
  "via-del-missile": ["trad", "Clearly alpine: very few pitons, first pitch has no protection. Two sets of medium cams, plus huge ones."],
  "cane-cico": ["runout", "Bolts 7-8 m apart on poor rock and gear can't be placed. Steady head needed."],
  "diedro-baldessarini": ["trad", "Old pitons and threads; some sections need backing up, but gear placements are few and poor."],
  "lungo-il-fiume-e-sullacqua": ["runout", "Advertised as well bolted, but first bolts are 8-10 m up and some are 7 m apart."],
  sguarauunda: ["bolted", "Bolted; one 35 m slab traverse has bolts 4-5 m apart."],
  "minuetto-a-ceniga": [null, null],
  "fiaba-nel-bosco": ["runout", "Close bolting, except at the top of one pitch where it's very spaced (a small-medium cam fits)."],
  "ego-trip-mandrea": ["bolted", "Bolts close enough to aid if needed."],
  "porci-con-le-ali": ["bolted", "Bolted; one traverse under the roof is quite spaced."],
  "la-cengia-rossa": ["bolted", "Bolted; one bolt is further than elsewhere on the route."],
  "cima-alle-coste-parete-di-sherwood-via-little-john": ["bolted", "Very good bolting, extra gear almost useless. Belays are two bolts: bring slings."],
};

// Fallback for posts not in CURATED. Coarse on purpose; review its output and
// add the slug to CURATED.
const TRAD_RE = /alpinistic|(?:è|e') (?:spesso |quindi )?necessari[oa] (?:integrare|proteggersi|inserire)|proteggersi a friend|proteggere a friend|dadi e friend|da proteggere|necessita di integrazion/gi;
const RUNOUT_RE = /distanziat|distant|sprotett|non (?:è )?(?:possibile|facile) integrare|lontan|friend|integr/gi;

function heuristic(fullText) {
  const trad = fullText.match(TRAD_RE)?.length ?? 0;
  const runout = fullText.match(RUNOUT_RE)?.length ?? 0;
  if (trad >= 2) return "trad";
  if (trad || runout >= 2) return "runout";
  return /chiodatura|spit|fix\b|protezion|chiodi|cordon/i.test(fullText) ? "bolted" : null;
}

/** "runout" table value -> bolted style + runout flag. */
function toGear(level, note, source) {
  const style = level === "runout" ? "bolted" : level;
  return { style, runout: level === "runout", note, source };
}

/** @returns {{ style: "bolted" | "trad" | null, runout: boolean, note: string | null, source: "curated" | "heuristic" }} */
export function classifyGear(slug, fullText) {
  if (slug in CURATED) {
    const [level, note] = CURATED[slug];
    return toGear(level, note, "curated");
  }
  const level = heuristic(fullText);
  console.warn(`gear: ${slug} not curated, heuristic says ${level}; add it to scripts/lib/gearStyle.mjs`);
  return toGear(level, null, "heuristic");
}
