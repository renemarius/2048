# v2 Connective Forms — Sentence Builder mode

Referenced from `constitution.md`'s v2 checklist (`Connective forms`) and
Open Decisions Log. `specs/tenses-v2.md` cut connectives from Level 3
because a connective doesn't end a word, it links two clauses, so it can't
be a stem+ending merge on the 2048 board. This spec resolves that by making
connectives their **own standalone mode** (sibling of Concentration in
`specs/game-modes-v2.md`), not a board mechanic.

## Mode — DECIDED

**Sentence Builder**: a Duolingo-style translate-by-tiles drill.

1. The player sees an English sentence, e.g. *"Because I eat breakfast, I
   read a book."*
2. Below it is an empty answer row and a **word bank** of Korean tiles
   (space-separated eojeol): the correct tiles plus distractors.
3. The player builds the Korean sentence by **clicking** bank tiles into the
   answer row (click an answer tile to return it) or **dragging** them in and
   reordering within the row. A **Check** button grades it.
4. Correct → green feedback, score + combo. Wrong → the correct answer is
   shown, streak resets. **Next** advances.

Click is the primary input; drag is an enhancement (HTML5 drag events don't
fire on touch, so mobile is not covered — consistent with mobile being a v3
item).

## Connectives in scope — DECIDED

Core four, applied to all learned words (Level 1 + Level 2) through the
existing engine. `-는데` is deliberately out of the first cut (its
adjective-vs-verb split is extra content to verify).

| Connective | Meaning | English template (C1, C2 = clause translations) | Korean rule on the clause-1 word's stem |
|---|---|---|---|
| `-고` | and (then) | "C1, and C2." | stem + 고, all classes, no change |
| `-지만` | but | "C1, but C2." | stem + 지만, all classes, no change |
| `-아서/어서` | because / so | "Because C1, C2." | `conjugate(word, 'present')` minus trailing 요, + 서 — reuses the 아/어 engine, so every class (incl. irregulars, 하다 → 해서) is correct by construction |
| `-(으)면` | if | "If C1, C2." | see table below |

### `-(으)면` rule table

Parallels the future tense's `-(으)ㄹ 거예요` (same class-by-class stem
logic, different suffix), so it lives beside `conjugateFuture*` in
`packages/core/src/conjugate.ts`.

| Class | Rule | Example |
|---|---|---|
| Open stem (regular, 르, ㅡ, 하다) | stem + 면 | 가면, 모르면, 크면, 하면 |
| Batchim stem (regular) | stem + 으면 | 먹으면 |
| ㄹ-batchim stem (regular) | stem + 면 (ㄹ kept, no 으) | 살면, 놀면 |
| ㄷ-irregular | ㄷ→ㄹ, then + 으면 | 들으면 |
| ㅂ-irregular | drop ㅂ, + 우면 (돕다 too, as in future) | 추우면, 도우면 |
| ㅅ-irregular | drop ㅅ, + 으면 | 지으면 |
| ㅎ-irregular | drop ㅎ, + 면 (no 으, no ㅐ merge) | 그러면, 빨가면 |

**Must be verified against reference sources before the tests are written**,
same bar `tenses-v2.md` set for future tense. The ㅎ row and the ㄹ-batchim
row are the two I am least sure of from memory.

## Content: reuse example sentences — DECIDED

Rather than hand-writing a new sentence bank (typo risk) or auto-generating
English from the bare glosses (`'laugh/smile'`, `'wear (shoes)'`,
`'not exist/not have'` would produce broken English), sentences are
**composed from the existing `exampleSentence`/`exampleTranslation`** pairs,
which are already hand-written and tested against the engine
(`vocab.test.ts`).

Given two learned words A and B (A ≠ B):

- **Korean:** A's example sentence with its trailing present-polite form
  replaced by A's connective form, followed by B's example sentence. If both
  start with `저는`, B's is dropped (Korean drops the repeated subject).
  e.g. `저는 아침을 먹` + `고` + `책을 읽어요.` → **저는 아침을 먹고 책을 읽어요.**
- **English:** the connective template applied to the two translations
  (trailing period stripped, second clause lowercased unless it starts with
  "I" or a proper noun such as "Korean").
- **Tiles:** the Korean sentence split on spaces (punctuation dropped).
- **Distractors (2–3):** A's stem with a *wrong* connective, A's plain
  present-polite form, and one tile from an unrelated word's sentence —
  chosen so the player must actually pick the right connective and
  conjugation, not just order words.

Consequences:

- Sentences can be semantically odd ("If I sleep, I eat breakfast") — same
  as Duolingo. Grammar is guaranteed; sense is not.
- Not every example sentence can host a connective: it must end with its
  own present-polite `conjugate()` output. `vocab.test.ts` already
  implies this; a new test asserts it for every word so a sentence that
  can't be split fails loudly.

## Word source — DECIDED

Only words in the player's **dictionary** (same premise as Concentration:
retention drill, not testing unseen words). Gate: `CONNECTIVE_MIN_WORDS`
learned words (proposed **4**), below which the mode shows a progress-style
empty state pointing back to Normal, mirroring Concentration's.

## Scoring & combo — DECIDED

- Base **+10** per correct sentence.
- **Streak multiplier** on consecutive correct answers: ×1 for streaks 0–2,
  ×2 from the 3rd in a row, ×3 from the 5th, capped at ×3. A wrong answer
  resets the streak (no lives).
- Session-scored only, like Concentration: no mastery-count or dictionary
  writes.
- Own best-score track: `bestScoreKey('connectives')` in
  `apps/web/app/storage-keys.ts` (fourth track alongside Normal / Hard /
  Concentration).

### Session length — DECIDED

A session is **10 sentences** (`CONNECTIVE_SESSION_LENGTH`), then a summary
card (score, accuracy, best streak) with Play again. Without a fixed length
the mode has no natural end and a "best score" is meaningless in an endless
mode with no lives. Confirmed by the user.

### Implementation notes (added during build)

- `CONNECTIVE_MIN_WORDS = 4` confirmed by the user.
- The first clause is lowercased too for the "Because C1, …" / "If C1, …"
  templates (only the second clause was called out above), otherwise
  "Because The baby laughs" would result. `I`, `I'm`/`I'd`, `Korean` and
  `Seoul` stay capitalized.
- `-(으)면` reference check: rows were checked against standard grammar
  references from knowledge, not a live lookup — the ㅎ row (그러면, 빨가면)
  and ㄹ-batchim row (살면, 놀면) came out as the spec predicted, and 돕다 →
  도우면 (not 도오면) follows the same rule as future tense. Worth a native
  speaker's glance at the 34 Level 2 rows in
  `connectives.test.ts`'s table if anything looks off in play.
- Session/answer state is not persisted across reloads (like
  Concentration); only the best score is.

## Architecture

- `packages/core/src/connectives.ts` (new, no React/DOM): connective
  definitions and their conjugation functions, sentence composition
  (`buildSentence(wordA, wordB, connective, random)` → `{ english, korean
  tiles, distractors }`), answer checking, score/multiplier function.
- `packages/core/src/conjugate.ts`: `-(으)면` stem functions beside the
  future ones.
- `apps/web/app/sentence-builder.tsx` (new) + a `'connectives'` entry in
  `mode-switcher.tsx`'s `GameMode`.
- Styling through the existing CSS-variable tokens so theming stays
  swappable.

## Test plan

- **Exhaustive:** every one of the 96 words × all 4 connectives asserted
  against a hand-verified expected form, same standard as the tense suites.
  (This is the correctness-critical part — Principle 1.)
- Every example sentence splits cleanly (ends with its own present form).
- Composition: token list joins back to the exact Korean sentence;
  distractors never equal a correct token; answer checking accepts only the
  exact sequence.
- Scoring: multiplier thresholds and reset-on-wrong.

## Not verifiable without a browser

Drag/drop feel, tile animations, and click-vs-drag disambiguation need a
hands-on pass by the user, per CLAUDE.md's verification bar.
