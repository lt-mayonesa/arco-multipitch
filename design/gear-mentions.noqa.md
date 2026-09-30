# Research: do posts mention quickdraws / gear?

Scanned all 69 posts in `data/raw-posts.json` (paragraph text only) for
Italian gear vocabulary.

## Short answer

- **Quickdraw counts: never.** No post says "N rinvii". The word *rinvio*
  (6 posts) only shows up in climbing narration ("superato il terzo rinvio",
  "un bel volo al quarto rinvio").
- **Rope: almost never.** Only `ego-trip-mandrea` mentions half ropes
  (*mezze corde*), and only in passing. No post gives a rope length
  (50/60/70 m) or says whether one rope is enough to rappel.
- **Trad gear: often, but as free text, pitch by pitch.** No post has a
  structured "Materiale:" section.

## What is there

| term | posts | typical use |
| --- | --- | --- |
| *friend* (cams) | 29 | "è possibile integrare con un friend", "un friend medio in uscita dalla lama" |
| *cordoni / cordini* (slings) | ~50 (mostly fixed slings as protection) | threads (*clessidre*) and trees to sling; "portare cordini per integrare" the belays |
| *dadi / nut* | 7 | "integrare a dadi e friends" |
| *integrare / protezioni rapide* | ~40 | "necessario integrare", "stile alpinistico" |
| *chiodi* (pitons) | 24 | describe fixed gear, not what to bring |

Occasionally there's a size/quantity hint, but never a full rack:

- `rampa-centrale`: "portarsi 2 set di friend medio/grandi"
- `claudia-22`: "una coppia di friend medio-piccoli"
- `cuore-doro`: "qualche friend medio/piccolo"
- `anche-le-donne-vogliono-arrampicare`: "un paio di friend medio/grandi … fondamentali"
- `linquisitore`: large crack "utile solo se si hanno friend veramente grandi"
- `apollo`, `il-profondo-risetto-dellindria`: "friend medio(-grande)"
- `castagnarte`: "con una coppia di friend" (to aid the crux)
- `via-del-missile`: 45 m pitch, "dosatura della ferraglia" (ration your rack)

Protection *style* is usually stated in the outro: from "chiodatura
abbondante / quasi inutile integrare" (sport-like) through "è necessario
integrare con dadi e friend" to "non è possibile integrare" (runout, and
there's nothing to place). That's the most consistent signal.

## If we want to surface it

A per-pitch quickdraw count can't be extracted, because the source doesn't
have that data. Realistic options:

1. **Gear hint per route** (like `sunHint`): a coarse flag computed in
   `02-parse-routes.mjs`, e.g. `bolted` / `bring-cams` / `trad` /
   `runout-no-gear`, from keyword counts (friend/dadi/integrare vs.
   "chiodatura abbondante", "non è possibile integrare"). Show it as a soft
   hint, like the sun one.
2. **Quote the gear sentences**: extract the matching sentences (like the
   list above) and show them translated under "Gear notes". This is more
   faithful, but they'd need translating (same `translation-en.md` flow, new
   `<slug>::gear` key).
3. **Quickdraws**: default to "pitch length ÷ ~3 m + 2" as a rule of thumb.
   That would be our guess, not the author's, and would have to be labelled
   that way. Not recommended.

## Outcome

Went with option 1, curated rather than regex. `scripts/lib/gearStyle.mjs`
has a hand-reviewed table of all 69 slugs → `gear: { level, note, source }`:

- `bolted` (19): fixed protection is enough (bolts, or pitons/slings on old lines).
- `runout` (25): mostly fixed protection, but the author flags a big runout;
  an optional cam or none possible.
- `trad` (22): alpine style, you must place gear. Beats `runout`.
- `null` (3): write-up doesn't say.

Each has a short English `note` paraphrasing the author. Posts not in the
table fall back to a keyword heuristic (`source: "heuristic"`, ~2/3 agreement
with the curated set) and 02 warns so they get curated. UI: Trad/Runout
badge on cards, badge + note in detail, "Protection" filter
(Any / No trad / Bolted only / Trad only).
