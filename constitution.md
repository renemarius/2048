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

- **Stem tiles** — a verb/adjective root (e.g. `가-`, `먹-`, `좋-`).
- **Ending tiles** — a grammatical ending (e.g. `-아요`, `-었어요`).

Unlike vanilla 2048 (identical tiles merge), here **a stem tile merges with
a grammatically compatible ending tile** to produce a single **word tile**
showing the conjugated form (e.g. `가-` + `-아요` → `가요`). A word tile can
then merge again with a further compatible ending tile to re-conjugate
(e.g. `가요` + `-았어요` → `갔어요`), chaining the way 2/4/8 chains in
classic 2048.

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

### 3.2 Board mechanics — OPEN, recommended default

- **Spawn:** after each move, one new tile spawns in a random empty cell.
  It is a stem tile with probability weighted toward words not yet fully
  conjugated in this session, or an ending tile compatible with at least
  one stem currently on the board.
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
| First time *ever* a base word reaches its past-form stage (added to the permanent dictionary) | +50, one-time per word |
| Multiple merges triggered by one keypress | each merge's points, summed — matches 2048's chain behavior |

- The **dictionary** is a persistent (`localStorage`) list of every
  distinct base word the player has successfully conjugated to its final
  v1 stage at least once, across all sessions ever played. The first time
  a given base word reaches that stage, it's added to the dictionary and
  the +50 bonus fires — this is the "new word overall" hook you described.
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
- [ ] `apps/web`: board renders on Vercel, keyboard (arrows + WASD) control
      works, per `specs/ui-v1.md`
- [ ] `apps/web`: score updates on merge (see Section 3.3); dictionary
      persists new words to `localStorage` across sessions
- [ ] `apps/web`: theme toggle (Classic / Modern ink & paper) implemented
      and persisted, per `specs/ui-v1.md`
- [ ] `apps/web`: minimal dictionary panel (word + meaning list, no
      search/filter) implemented, per `specs/ui-v1.md`
- [x] Game-over detection works (no legal moves remain) — implemented and
      unit tested in `packages/core`; not yet wired into the UI
- [ ] Played end-to-end by you, by hand, and it's actually fun / correct
- [ ] Deployed and reachable on a Vercel URL

### v2 — Educational depth (future)

- [ ] Broaden vocab list / add irregular conjugation classes
- [ ] Additional tenses/endings (future tense, connective forms, etc.)
- [ ] Explicit levels or difficulty progression
- [ ] Enhanced dictionary UI (search/filter/stats on top of v1's minimal
      panel)

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

- Section 3.2 spawn weighting and game-over edge cases — tune during build
