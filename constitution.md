# Constitution — 2048 Hangul Conjugation

Working title. A 2048-style tile game where merging tiles conjugates Korean
verbs/adjectives instead of adding numbers, to help A1–A2 Korean learners
absorb vocabulary and conjugation patterns through play.

This document is the source of truth for the project. It is also the
checklist: each version's scope is a set of checkboxes. A version is not
"done" until every box in its section is checked and verified working.

Status legend: `DECIDED` = locked in from your answers. `OPEN` = a scoping
call I made to keep v1 shippable in a week — flag it if you want it changed.

---

## 1. Vision & Problem

Korean vocabulary apps drill words in isolation (flashcards, SRS). This game
ties vocabulary acquisition to an addictive, already-proven mechanic (2048),
and specifically targets **conjugation** — the part learners usually find
most mechanical and least fun to drill — by making it the core puzzle
action.

**Target user:** learners at A1–A2 Korean level.

**Success for v1:** the game is fun enough that *you* want to keep playing
it to review vocab. No external users, no metrics infrastructure — success
is judged by hand.

## 2. Core Principles (non-negotiable)

1. **Grammar correctness over feature breadth.** A wrong conjugation is a
   bug, not a nice-to-have. If a rule can't be implemented correctly in the
   time available, cut the rule (fewer verb types/tenses) rather than ship
   it wrong.
2. **Client-side only, no backend, for v1.** No auth, no server, no
   database. State lives in the browser (`localStorage`). This keeps
   scope inside a one-week solo build.
3. **Core logic is framework-agnostic.** The board/merge engine and the
   conjugation engine are plain TypeScript with zero UI or Next.js
   dependencies, so the same code can later power a React Native /
   Expo mobile app without a rewrite. UI code may depend on the core;
   the core must never depend on UI.
4. **No external NLP/dictionary APIs for v1.** Conjugation is computed by
   rules you own in-repo — no network dependency, no rate limits, no
   compliance surface.
5. **Ship the loop before the polish.** Theming/customization (pastel,
   neon, gothic, etc.) is explicitly deferred — see Out of Scope.

## 3. Core Game Design — DECIDED mechanic

Two tile types exist on a 4×4 board:

- **Stem tiles** — a verb/adjective root, grammatically (e.g. `가-`,
  `먹-`, `좋-`). **Displayed on the tile as the full dictionary form**
  (e.g. `가다`, `먹다`) rather than the bare hyphenated stem — clearer for
  a learner, and it's the form they'd actually look up.
- **Ending tiles** — a grammatical ending, grammatically (e.g. `-아요`,
  `-었어요`). **Displayed on the tile as the Korean grammar term** `현재`
  (present) or `과거` (past) rather than a literal suffix, since one
  ending tile is generic and its actual surface form depends on whichever
  stem it merges with (see `specs/ui-v1.md`).

Unlike vanilla 2048 (identical tiles merge), here **a stem tile merges with
a grammatically compatible ending tile** to produce a single **word tile**
(displayed as its conjugated `surfaceForm`, e.g. `가요`) — grammatically,
`가-` + `-아요` → `가요`. A word tile can then merge again with a further
compatible ending tile to re-conjugate (e.g. `가요` + `-았어요` → `갔어요`),
chaining the way 2/4/8 chains in classic 2048.

Movement: arrow keys / WASD shift the whole board in one direction, as in
2048. Tiles slide until they hit the edge or another tile; if the tile they
hit is a compatible merge partner, they combine into the resulting tile.
Incompatible tiles block each other like normal 2048 tiles (they stop
sliding but do not merge).

### 3.1 Grammar scope for v1 — DECIDED

Full vocab list, pattern groups, and word-by-word verification live in
[`specs/vocab-v1.md`](specs/vocab-v1.md). Implementing the full Korean
conjugation system (all irregulars: ㄷ, ㅂ, 르, ㅅ, ㅎ, ㅡ-contraction,
honorifics, etc.) in a week is not realistic without correctness risk, so
those remain excluded. Locked v1 scope:

- **Verb/adjective set:** 62 regular (non-irregular) A1–A2 verbs/adjectives
  across 4 deterministic pattern groups (see `specs/vocab-v1.md`):
  1. batchim-final stems (ㅏ/ㅗ → 아, else → 어)
  2. open-vowel stems with same/near-vowel elision (가다→가요)
  3. open-vowel stems with diphthong formation (오다→와요, 배우다→배워요)
  4. 하다-verbs (fixed 하다→해요 substitution)
- **Endings supported:** present polite (`-아요/어요/여요`) and past polite
  (`-았어요/었어요/였어요`) only.
- **Irregulars (ㄷ/ㅂ/ㅅ/르/ㅎ), ㅡ-contraction, future/other tenses, formal
  speech levels, connective endings** → deferred to v2+ (see
  `specs/vocab-v1.md` for the excluded-word examples that seed the v2
  vocab backlog).

### 3.2 Board mechanics — DECIDED

- **Active word pool:** only 4 words are "in rotation" at any time (not
  the full 62-word vocabulary) — stems only spawn from this pool. A
  smaller pool means the same few words recur often enough to actually
  learn them; the original "spawn from all 62 words at once" design made
  the board feel chaotic and made scoring hard, since a useful stem/ending
  pairing was rare against 62 competing possibilities. Ending tiles stay
  generic (present/past) and work with whatever stem they land near,
  independent of the pool.
- **On word completion** (a pool word reaches its past/final stage):
  the word is retired from the pool and a replacement is drawn from the
  remaining not-yet-completed vocabulary; every tile belonging to the
  completed word on the board — its stem, present-stage, and any stray
  duplicates, not just the one that just merged — is cleared, freeing
  space; the replacement word's stem is placed onto the board. The
  completed tile stays fully visible for ~1.2s so the player actually
  reads what they conjugated, then fades out over ~0.3s before being
  cleared (see `packages/core/src/pool.ts` and `apps/web/app/game.tsx`).
- **Spawn (demand-driven, not flat-probability):** after each move, one
  new tile spawns in a random empty cell, chosen from whichever of these
  the board actually needs right now (uniformly among the ones that
  apply; see `analyzeBoardNeeds` in `packages/core/src/board.ts`):
  - a **missing pool word's stem** — a pool word with no live tile
    (stem or word, any stage) anywhere on the board. A pool word that
    already has a tile in play is never re-spawned as a duplicate stem.
  - a **present ending**, while stems on the board outnumber present
    endings (deficit = stem count − present-ending count, floored at 0)
  - a **past ending**, while present-stage word tiles outnumber past
    endings (same deficit logic)

  If none of these apply (board already has everything it currently
  needs — rare, self-correcting on the next move), fall back to a
  generic weighted spawn so an empty cell is never left unfilled. This
  replaced an earlier flat 50/50 stem-vs-ending split that had no notion
  of "enough" — endings could pile up indefinitely once the small active
  pool ran out of stems to pair them with, and duplicate stems for a
  word already in play were common, both of which visibly clogged the
  board in practice.
- **Spaced-review resurfacing (added this session, see Open Decisions
  Log):** the active pool alone means a word never appears on the board
  again once completed — good for first-time learning, bad for actual
  memorization, which is the whole point for the target A1–A2 audience.
  On every spawn, with `REVIEW_CHANCE` probability (0.4, tunable —
  `apps/web/app/game.tsx`) one word already in the permanent dictionary
  (excluding whatever's currently in the active pool) is offered as an
  extra stem-spawn candidate via `pickReviewWord` (`packages/core/src/pool.ts`).
  A review word completing again doesn't retire/replace anything (it was
  never in `pool.active`) and doesn't re-award the +50 bonus, but it does
  increment that word's mastery count (Section 3.3) and still scores the
  normal merge points.
- **Game over:** board full and no adjacent stem/ending or word/ending pair
  is grammatically compatible (no legal merge remains) — direct analogue
  of 2048's loss condition.
- **Win condition:** none in v1. This is an endless scoring session, not a
  race to one target tile. (2048's "reach 2048" win can be revisited once
  the core loop is proven fun — e.g. "reach past tense on 5 different
  words in one session.")

### 3.3 Scoring & Dictionary — DECIDED

Modeled directly on classic 2048's scoring (value of the new tile is added
to score; multiple merges from one move sum together; a persisted best
score sits alongside the current session's score) but adapted since our
tiles have no numeric value — the "value" of a merge is its depth in the
stem→word→conjugated-word chain instead.

| Event | Points |
|---|---|
| Stem + present ending → word tile (present form) | +10 |
| Word (present) + past ending → word tile (past form) | +20 |
| Stem + future ending → word tile (future form) — Level 3, `specs/tenses-v2.md`, not yet implemented | +30 (matches the present→past route's summed total, since future retires a word in one merge instead of two) |
| First time *ever* a base word reaches its past-form **or** future-form stage (added to the permanent dictionary) | +50, one-time per word |
| Multiple merges triggered by one keypress | each merge's points, summed — matches 2048's chain behavior |

- The **dictionary** is a persistent (`localStorage`) list of every
  distinct base word the player has successfully conjugated to a terminal
  stage (past, or future once Level 3 ships) at least once, across all
  sessions ever played. The first time a given base word reaches either
  terminal stage, it's added to the dictionary and the +50 bonus fires —
  this is the "new word overall" hook you described.
  Each dictionary entry also tracks a **mastery count** — how many times
  that word has ever reached past-stage, including from spaced-review
  resurfacing (Section 3.2) in later sessions — shown in the dictionary
  panel so a learner can see which words they've actually drilled versus
  only completed once (`packages/core/src/dictionary.ts`'s
  `DictionaryEntry`/`updateDictionary`).
- Each dictionary entry now also carries an **example sentence**
  (`VocabEntry.exampleSentence`/`exampleTranslation`, `packages/core/src/vocab.ts`)
  using the word's own present-polite surface form, so the panel
  reinforces the exact conjugation the game just taught rather than
  restating the dictionary form. `vocab.test.ts` asserts every sentence
  actually contains that word's real `conjugate()` output, catching
  hand-written-content typos the same way the engine's own tests do.
- **Best score** persists in `localStorage`, separate from the dictionary,
  same as classic 2048.
- These point values are a first-pass ratio, not a hard requirement —
  fine to retune by feel once it's playable, as long as deeper merges keep
  outscoring shallow ones.

## 4. Non-Functional Requirements — DECIDED

- **Scale:** solo use, effectively 1–10 concurrent users. No load,
  availability, or compliance requirements (no COPPA/GDPR surface — no
  accounts, no PII collected).
- **State:** client-side only (`localStorage`), no server-authoritative
  state, no cheat prevention needed.
- **Platforms:** web first (v1). Mobile is a planned future target, not
  v1 — architecture (Principle 3) must not block it.
- **Offline:** not a v1 requirement, but a natural side effect of
  client-only state — don't actively break it.

## 5. Technical Stack — DECIDED

- **Hosting:** Vercel.
- **Framework:** Next.js (App Router) + TypeScript, React for UI — the
  natural fit for Vercel and for later reuse of patterns/skills toward
  React Native.
- **Structure:**
  - `packages/core/` — framework-agnostic TypeScript: board state, merge
    rules, conjugation engine, dictionary/session scoring logic. No React,
    no Next.js imports. Pure functions + types, unit-testable in isolation.
  - `apps/web/` — Next.js app that imports `packages/core` and renders the
    board, handles keyboard input, persists to `localStorage`.
- **Testing:** the conjugation engine gets unit tests (it's the
  correctness-critical, hardest-to-eyeball part per Principle 1).
- **Styling:** deferred choice, but keep it swappable — theming is a named
  v2+ feature (Section 7), so avoid hard-coding colors/values that fight a
  future theme system.

## 6. Out of Scope for v1 (explicit)

- Accounts/auth, login/signup, cross-device sync
- Leaderboards, achievements, daily challenges, undo/save-resume beyond
  simple session persistence
- Monetization (ads/IAP) — not planned at all currently
- **Full theme gallery** (pastel, gothic, neon, monotone, etc.) — v1 ships
  with exactly two built-in looks (see `specs/ui-v1.md`); the expanded,
  customizable theme system remains v3 scope
- Mobile app packaging (native or PWA install)
- Irregular conjugations, tenses beyond present/past, formality levels
  beyond polite (-요) form
- Any backend, database, or external API

## 7. Versioned Roadmap & Validation Checklist

### v1 — Core Loop (target: 1 week)

- [x] `packages/core`: board state model (4×4 grid, tile types) implemented
- [x] `packages/core`: conjugation engine — regular verbs/adjectives,
      present + past polite forms, vowel harmony — with unit tests covering
      the full v1 word list (all 62 words, 75 passing tests)
- [x] `packages/core`: merge/move logic (slide, merge on grammatical
      compatibility, spawn new tile) — unit tested independent of UI
      (161 passing tests across hangul/conjugate/vocab/board)
- [x] `packages/core`: active word pool (Section 3.2) — spawn restricted
      to the pool, clear-and-replace on word completion, demand-driven
      spawn formula (`analyzeBoardNeeds`) — implemented and unit tested
      (`pool.ts`, `clearCompletedTiles`; 176 tests total)
- [x] `apps/web`: board renders, keyboard (arrows + WASD) control works,
      per `specs/ui-v1.md` — verified via local dev/build; not yet
      deployed to Vercel (see the separate deploy checklist item below)
- [x] `apps/web`: session score updates on merge (see Section 3.3), best
      score, board state, and the active pool all persist across reload
      via `localStorage`
- [x] `apps/web`: dictionary persists new words to `localStorage` — a base
      word's first-ever past-stage completion adds it to a persistent
      dictionary (`packages/core/src/dictionary.ts`'s `updateDictionary`,
      unit tested) and fires the +50 one-time bonus and a "new word" toast;
      verified via `npm run test`/`typecheck`/`build` and a running
      `next dev` serving the updated markup with no compile errors — the
      toast's on-screen appearance/timing and the +50 actually landing from
      a real keypress-driven merge are not yet confirmed by hand
- [x] `apps/web`: theme toggle (Classic / Modern ink & paper) implemented
      and persisted, per `specs/ui-v1.md`
- [x] `apps/web`: minimal dictionary panel (word + meaning list, no
      search/filter) implemented, per `specs/ui-v1.md` — themed per the
      Dictionary Panel Visual Treatment spec (Classic "digital tablet"
      bezel, Modern "notebook paper" ruled lines); same verification
      caveat as above — the two themed skins haven't been eyeballed in a
      real browser yet
- [x] Game-over detection works (no legal moves remain) — implemented,
      unit tested, and wired into the UI (game-over modal + restart)
- [x] Played end-to-end by you, by hand, and it's actually fun / correct
      — confirmed, including the active-pool rework and v1.5 additions
- [x] Deployed and reachable on a Vercel URL —
      https://2048-zeta-five.vercel.app/

### v1.5 — Learning-optimized UX (session addition, explicit jump-ahead)

Added mid-session, before the last two v1 boxes above were checked off —
an explicit user decision to prioritize audience-facing learning features
(memorization/repetition, in-play reference material) over finishing the
playtest/deploy checklist items first. See Open Decisions Log below.

- [x] `packages/core`: spaced-review resurfacing (`pickReviewWord` in
      `pool.ts`) — already-learned dictionary words periodically resurface
      as board stems instead of disappearing forever once first completed;
      unit tested (5 new tests, `pool.test.ts`)
- [x] `packages/core`: dictionary mastery counts — `DictionaryEntry` now
      tracks `count` (times conjugated to past stage, ever), not just
      membership; unit tested (`dictionary.test.ts`, rewritten for the new
      shape)
- [x] `packages/core`: example sentence + translation per vocab word
      (`VOCAB.exampleSentence`/`exampleTranslation`, all 62 words), unit
      tested against the engine's own `conjugate()` output so a typo'd
      sentence fails the suite
- [x] `apps/web`: dictionary panel converted from a centered, blocking
      modal to a docked right-side drawer — gameplay (including keyboard
      moves) keeps working while it's open, per the explicit "usable while
      playing" ask; Escape still closes it. Both theme skins (tablet /
      notebook paper) carried over to the new geometry.
- [x] `apps/web`: dictionary rows now show the example sentence,
      translation, and mastery count (`×N`) alongside word + meaning
- [x] `apps/web`: audio pronunciation via the browser's built-in
      `SpeechSynthesis` API (`ko-KR`) — speaker button on each dictionary
      row and on the "new word" toast; no backend/API key, silently no-ops
      if unsupported
- [x] Verified via `npm run test` (189 passing core tests), `npm run
      typecheck`, `npm run build` (all clean), and a running `next dev`
      serving the updated page with no compile errors
- [x] Hands-on browser pass: drawer slide animation, speaker button audio
      actually audible, review-word resurfacing visibly happening across a
      real play session — confirmed by hand

### v2 — Educational depth (future)

- [x] **Rules panel** — onboarding panel/modal explaining the objective
      and translating the `현재`/`과거` tile labels (present/past), since a
      new player has no other way to learn what those mean (see
      `specs/ui-v2.md`); a "?" header button opens it anytime, and it
      auto-opens once on first-ever visit (`localStorage`-tracked).
      Verified via `npm run test` (189 passing, unchanged), `typecheck`,
      `build` (all clean), and a running `next dev` serving with no
      compile errors. Hands-on browser pass (modal appearance, first-visit
      auto-open, Escape/button-click interaction) confirmed by the user
- [x] **Level 2 vocab: irregular conjugation classes** — ㄷ/ㅂ/ㅅ/르/ㅎ and
      ㅡ-contraction, the 34 words excluded from v1 (`specs/vocab-v1.md`'s
      excluded list), added as `VOCAB_LEVEL_2` with a dedicated
      conjugation function per class (including the 돕다 sub-exception
      within ㅂ-irregular) — replaces the old vague "explicit levels" item
      with a concrete two-level structure (see `specs/vocab-v2.md` for the
      full rule table). Level 2 stays out of the active pool until every
      one of Level 1's 62 words has reached past-stage at least once in
      the dictionary, then unlocks and mixes in via the existing pool
      replacement logic; a toast announces the unlock. Verified via
      `npm run test` (267 passing — 96 exhaustive per-word conjugation
      assertions plus the v1 suite, unchanged), `typecheck`, `build` (all
      clean), and a running `next dev` with no compile errors. The
      unlock's actual in-game feel (pacing, toast timing, pool mixing
      once triggered) hasn't been confirmed by hand yet — that requires
      actually completing all 62 Level 1 words in a real session, which
      wasn't done this session
- [ ] **Additional tenses — Level 3: future tense** — scope, merge model,
      unlock gate, and the full per-class grammar rule table are DECIDED
      and implemented, see `specs/tenses-v2.md`: `ConjugationStage`/`Tense`
      now include `'future'`; `conjugate()` dispatches to dedicated
      future-tense functions per class (`packages/core/src/conjugate.ts`);
      `attemptMerge` merges a stem directly with a future ending (+30,
      completes the word) as a parallel branch alongside the existing
      present→past chain; `analyzeBoardNeeds`/`spawnTile`/
      `createInitialBoard` gate future-ending spawns behind a new
      `futureUnlocked` parameter (`packages/core/src/board.ts`); the web
      app computes that gate from full-dictionary completion
      (`isFutureUnlocked` in `apps/web/app/game.tsx`), shows a Level 3
      unlock toast, adds a 미래 ending label/tile color, and the rules
      panel now explains the future-tense branch. Verified via
      `npm run test` (503 passing — 96-word exhaustive future-conjugation
      suite plus new board.ts merge/gating tests, rest unchanged),
      `typecheck`, `build` (all clean), and a running `next dev` serving
      with no compile errors. **Not yet confirmed by hand**: actually
      playing to a future-tense merge, watching the Level 3 unlock toast
      fire (requires completing all 96 words in a real session, which
      wasn't done this session), and reading the updated rules panel in
      the browser. Connective forms (-고, -아서/어서, -지만, -(으)면, -는데,
      etc.) are explicitly cut from this item — they're sentence-linking,
      not sentence-final, so they don't fit the stem+ending merge model at
      all; tracked as a separate, unscoped backlog item below instead of
      bundled here.
- [ ] Connective forms (-고, -아서/어서, -지만, -(으)면, -는데, etc.) — cut
      from the future-tense item above (`specs/tenses-v2.md`) because they
      require a different merge mechanic entirely (a clause+connective+
      clause combination, not a terminal stem+ending word). Unscoped:
      no spec, no target version yet.
- [x] **Hard mode** — a Normal-mode difficulty modifier: spawns 2 tiles
      per move instead of 1, plus a 2-cell "dead zone" that can never be
      spawned into or slid onto (`packages/core/src/hardmode.ts`'s
      `HardModeState`, and the `blocked` param threaded through
      `board.ts`'s `move`/`spawnTile`/`isGameOver`), relocating every 3-4
      moves. Exact mechanic was an OPEN decision in `specs/game-modes-v2.md`,
      resolved this session (see Open Decisions Log). Verified via
      `npm run test` (299 passing — 24 new tests across `hardmode.test.ts`
      and new blocked-cell cases in `board.test.ts`), `typecheck`, `build`
      (all clean), and a hands-on browser pass — the user confirmed the
      difficulty feel and relocation cadence play well
- [x] **Concentration mode** — a separate memory-match game mode
      (`apps/web/app/concentration.tsx`, `packages/core/src/concentration.ts`):
      flip tiles, match a Korean word to its English meaning, drawing
      only on words already in the player's dictionary (fixed 4x4/8-pair
      grid; an empty state below 8 learned words points back to Normal
      mode). Has its own session score and best-score track; correct
      matches stay purely session-scored, per the resolved OPEN decision
      in `specs/game-modes-v2.md`. Verified via `npm run test`, `typecheck`,
      `build` (all clean), and a hands-on browser pass — caught and fixed
      an invalid button-in-button nesting on matched cards' speaker button
      (was throwing a hydration error) that automated checks couldn't have
      caught; confirmed working after the fix
- [x] **Per-mode scoring** — best score now tracked separately for
      Normal, Hard, and Concentration instead of one shared best score
      (`apps/web/app/storage-keys.ts`'s `bestScoreKey(mode)`); Normal
      mode falls back to the pre-v2 unsuffixed key so existing progress
      carries forward. Verified alongside Hard/Concentration above.
- [x] Enhanced dictionary UI — search (word or meaning), a filter row
      (All / Level 1 / Level 2 / ★ Starred), alphabetical sort (Korean/
      Hangul order, toggled against the existing "order learned" default),
      and a bookmark/star toggle per row (see `specs/ui-v2.md`). Bookmarks
      persist as a new `bookmarked` field on `DictionaryEntry`
      (`packages/core`), carried through `updateDictionary` and changed
      only by the new `toggleBookmark`, with back-compat defaulting for
      dictionaries saved before this field existed. Verified via
      `npm run test` (272 passing — new `toggleBookmark`/bookmark-carry
      tests, rest unchanged), `typecheck`, `build` (all clean), and a
      fresh `next dev` with no compile errors. Not yet confirmed by hand:
      actually using search/filter/sort/bookmark in a real browser
- [x] Dictionary panel color fix (Classic theme) — the "digital tablet"
      bezel/screen now reuse Classic's own existing tokens (`--board-bg`
      for the bezel, `--tile-stem`/`--tile-stem-text` for the screen/text)
      instead of a dark near-black gray that clashed with the rest of the
      theme (see `specs/ui-v2.md`). Verified via the same automated bar
      as the rules panel above, plus a hands-on browser pass — the user
      confirmed the new palette actually fits

### v3 — Personalization & polish (future)

- [ ] Full theme gallery beyond v1's two defaults (pastel, gothic, neon,
      monotone...)
- [ ] Mobile app (React Native/Expo, reusing `packages/core`)
- [ ] Accounts + cross-device progress sync
- [ ] Leaderboards / achievements / daily challenges

Later versions (v4+) to be defined once v3 ships.

## 8. Open Decisions Log

Track anything still unresolved here as it comes up, so it doesn't get lost
between sessions:

- **v2 feature set (this session):** brainstormed and locked v2 scope
  beyond the pre-existing backlog bullets. This entry intentionally
  stays high-level — detail lives in the three new specs it links, per
  this file's own convention of pushing implementation-level detail out
  of the constitution.
  - **Onboarding rules panel** — DECIDED. See `specs/ui-v2.md`.
  - **Vocab expansion** — DECIDED as Level 2 = the irregular classes
    already catalogued in `specs/vocab-v1.md`'s excluded list (34 words
    across ㄷ/ㅂ/ㅅ/르/ㅎ/ㅡ-contraction), not an open-ended word-count
    increase. See `specs/vocab-v2.md`.
  - **Difficulty:** considered several ideas for a harder mode (faster
    board pressure, distractor ambiguity, a timer/decay bonus, disabling
    the spaced-review safety net, a wider active pool) and picked
    **smaller/faster board pressure** as the one Hard mode for v2. Exact
    tuning is still OPEN. See `specs/game-modes-v2.md`.
  - **New mode:** a **click-and-match mode** (click two adjacent
    compatible tiles instead of arrow-sliding) was proposed, then
    explicitly dropped — the user decided one hard-mode variant plus one
    new mode is enough scope for v2.
  - **Concentration mode** — DECIDED as that one new mode: a classic
    memory/match minigame, Korean word ↔ English meaning, drawing only
    from words already in the player's dictionary (not the full vocab
    list), so it reinforces retention rather than testing unseen words.
    Standalone mode, its own scoreboard. See `specs/game-modes-v2.md`.
  - **Scoring** — DECIDED: three separate best-score tracks going
    forward (Normal / Hard / Concentration) replacing v1's single shared
    best score. Section 3.3/4 will need a v2 addendum once implemented.
  - **Dictionary UI** — DECIDED: search, filter, alphabetical sort, and
    a bookmark/star tab, on top of the v1.5 panel. See `specs/ui-v2.md`.
  - **Visual fix** — Classic theme's dictionary panel currently clashes
    with its own palette; DECIDED to restyle it to match rather than
    leave it as a known visual bug. See `specs/ui-v2.md`.
- **Additional tenses — Level 3 (this session):** scoped and DECIDED
  before any code, per this project's spec-driven workflow. Full detail
  in `specs/tenses-v2.md`; the entry here stays high-level per this
  file's own convention.
  - **Naming:** "Level 3" (content-difficulty tier, sibling of Level
    1/Level 2) is a different axis from roadmap "v3" (Section 7's
    Personalization & polish) — Level 3 ships under the v2 milestone, not
    v3. Flagged explicitly since the numbering coincidentally lined up
    through Level 2/v2 but diverges from here.
  - **Merge model** — DECIDED as a parallel branch off the stem (future
    isn't grammatically derived from past), not a third link chained
    after past. A word retires the first time it reaches past *or*
    future, not both. Future-tense merge scores +30 (matches the
    present→past route's summed total).
  - **Unlock gate** — DECIDED to mirror Level 2's pattern: future endings
    stay out of the spawn pool until every unlocked-level word has
    reached past or future at least once, then unlock with a toast.
  - **Connective forms** — explicitly cut from this item, not deferred
    within it. They're sentence-linking (연결어미), not sentence-final,
    so they don't fit the stem+ending merge model regardless of tense
    work — see the v2 checklist's new standalone bullet.
- **Game modes v2 — OPEN items resolved (this session):** `specs/game-modes-v2.md`
  left three exact-mechanic decisions OPEN pending implementation; all
  three were resolved with the user before building:
  - **Hard mode mechanic:** both originally-listed options combined
    (spawn 2 tiles per move + a dead zone), not a lighter version of
    either — and the dead zone **relocates every 3-4 moves** rather than
    staying fixed, per explicit user direction.
  - **Concentration scoring:** a correct match stays purely
    session-scored — no mastery-count bump or other permanent-dictionary
    write.
  - **Concentration grid size:** fixed 4x4 (16 cells, 8 pairs), not
    dynamic — a dictionary under 8 words sees an empty-state message
    instead of a shrunk grid.
- **Dictionary persistence feature:** resolved — implemented as the
  permanent word dictionary, +50 one-time bonus, "new word" toast, and
  the tablet/paper-skinned dictionary panel (see the v1 checklist above).
  Hands-on browser pass (toast appearance/timing, both theme skins)
  confirmed.
- **Audience-focused learning UX (v1.5, this session):** the user
  reframed priorities around the actual target audience (A1–A2 Korean
  learners) before the last two v1 boxes (hands-on playtest, Vercel
  deploy) were checked off — an explicit instruction to jump ahead, per
  CLAUDE.md's spec-driven-workflow rule that otherwise defers v2+ work.
  Three specific asks plus two of my suggestions were confirmed via
  clarifying questions:
  - "More repetition" meant **spaced-review resurfacing** of already-
    learned dictionary words (not just tuning the existing 4-word active
    pool) — resolves the ambiguity that `advancePool` previously retired
    a completed word forever, once per session.
  - The dictionary panel becomes a **docked, non-blocking** right-side
    drawer (not the previous full-screen blocking modal, just moved) —
    the user explicitly wants to reference it *while* playing.
  - Added **audio pronunciation** (Web Speech API) and **mastery
    counts** per dictionary entry, on top of the three originally-named
    features (repetition, slide-out panel, example sentences). A
    "pattern-group hint on stems" suggestion was declined for now.
  - See the new v1.5 checklist section above for what shipped and what
    still needs a hands-on browser pass.
