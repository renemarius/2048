# Game Modes — v2

Referenced from `constitution.md`'s v2 checklist / Open Decisions Log.
v1 shipped exactly one mode (implicitly "Normal"); v2 adds one difficulty
modifier and one new standalone mode.

## Normal mode — unchanged

Today's mechanic (constitution.md Section 3), unmodified. Remains the
default on first load.

## Hard mode — DECIDED

A modifier on Normal mode's board mechanics (same conjugation rules,
same scoring, same active pool/spaced-review logic) built around
**smaller/faster board pressure** — less room to think, forcing quicker
reads of which stem/ending pairs are actually compatible. Considered and
rejected for v2: distractor ambiguity, a timer/decay bonus, disabling the
spaced-review safety net, and a wider active pool (see Open Decisions Log
for why — smaller/faster board pressure was the one picked).

Exact mechanic (resolved this session) is both of the originally-listed
options combined, not a lighter version of either:

- **Spawn 2 tiles per move** instead of 1 (board fills roughly twice as
  fast) — `apps/web/app/game.tsx`'s `handleMove` calls `spawnTile` twice
  in Hard mode.
- **A relocating dead zone**: 2 fixed cells (`HARD_MODE_BLOCKED_COUNT`,
  `packages/core/src/hardmode.ts`) that can never be spawned into or slid
  onto/through (true walls, not just spawn-exclusion — `board.ts`'s
  `move`/`spawnTile`/`isGameOver` all take an optional `blocked` cell
  set). The zone **relocates every 3-4 moves** (re-rolled each time,
  `HARD_MODE_RELOCATE_MIN`/`MAX`), always picked from cells that are
  currently empty so a relocation never traps a live tile underneath a
  wall it can't slide out from under.

## Concentration mode — DECIDED

A separate, standalone mode — not a modifier on Normal — implementing a
classic memory/match minigame:

- Tiles start face-down in a grid. Flipping two reveals their contents;
  a **Korean word ↔ its English meaning** is a match, anything else
  flips back after a short delay.
- **Word pool: the player's existing dictionary only** (words already
  learned in Normal/Hard play), not the full vocab list — this makes the
  mode a retention/reinforcement drill on words actually taught, not a
  test of unseen vocabulary. A player with an empty dictionary has
  nothing to play with yet — needs an empty-state message pointing them
  back to Normal mode first.
- Reuses the dictionary data (`packages/core/src/dictionary.ts`) as its
  source of truth; does not duplicate word/meaning data.
- Does **not** touch mastery counts or the permanent dictionary the way
  Normal/Hard spaced-review does (Concentration is a meaning-recall
  drill, not a conjugation drill) — DECIDED (resolved this session) as
  purely session-scored: a correct match awards `CONCENTRATION_MATCH_POINTS`
  (`packages/core/src/concentration.ts`) to the session score only, no
  write to `DictionaryEntry.count` or anywhere else in the permanent
  dictionary.
- **Grid size: fixed 4x4 (16 cells, 8 pairs)** — DECIDED (resolved this
  session), not dynamic. `CONCENTRATION_MIN_WORDS` (= 8) gates the mode:
  a dictionary with fewer than 8 words can't fill a unique 8-pair board
  without repeating a word, so `apps/web/app/concentration.tsx` shows a
  progress-style empty state ("`N` more words to unlock") pointing back
  to Normal mode instead of shrinking the grid.

## Per-mode scoring — DECIDED, implemented

Three separate best-score tracks, persisted independently in
`localStorage`: **Normal**, **Hard**, **Concentration**
(`apps/web/app/storage-keys.ts`'s `bestScoreKey(mode)`). Replaces v1's
single shared best score (constitution Section 3.3/4). Normal mode falls
back to reading the pre-v2 unsuffixed key
(`LEGACY_BEST_SCORE_KEY`/`LEGACY_SESSION_KEY`) if its own suffixed key is
empty, so an existing player's progress carries forward once instead of
resetting. The permanent dictionary itself stays a single shared store
across all three modes — only best-score tracking splits per mode.

## Implementation status

All three checklist items (Hard mode, Concentration mode, per-mode
scoring) are implemented and covered by `packages/core` unit tests
(`hardmode.test.ts`, `concentration.test.ts`, plus the blocked-cell cases
added to `board.test.ts`). Not yet confirmed by hand: Hard mode's actual
difficulty feel (spawn-2 + relocating dead zone together), the
relocation cadence "reading" as fair rather than jarring, and
Concentration's flip/match/mismatch interaction and empty-state copy in
a real browser — no browser automation tool was available this session.
