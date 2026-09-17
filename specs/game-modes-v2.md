# Game Modes — v2

Referenced from `constitution.md`'s v2 checklist / Open Decisions Log.
v1 shipped exactly one mode (implicitly "Normal"); v2 adds one difficulty
modifier and one new standalone mode.

## Normal mode — unchanged

Today's mechanic (constitution.md Section 3), unmodified. Remains the
default on first load.

## Hard mode — DECIDED direction, OPEN exact tuning

A modifier on Normal mode's board mechanics (same conjugation rules,
same scoring, same active pool/spaced-review logic) built around
**smaller/faster board pressure** — less room to think, forcing quicker
reads of which stem/ending pairs are actually compatible. Considered and
rejected for v2: distractor ambiguity, a timer/decay bonus, disabling the
spaced-review safety net, and a wider active pool (see Open Decisions Log
for why — smaller/faster board pressure was the one picked).

Exact mechanic still OPEN — pick one (or a light combination) before
implementation, e.g.:

- Spawn 2 tiles per move instead of 1 (board fills roughly twice as
  fast)
- Reduce effective playable board size (e.g. the 4×4 grid keeps a fixed
  "dead zone" of cells that can never be spawned into)
- Both of the above at a lower intensity each

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
  drill, not a conjugation drill) — OPEN whether a correct match should
  still increment anything, or stay purely session-scored.

## Per-mode scoring — DECIDED

Three separate best-score tracks, persisted independently in
`localStorage`: **Normal**, **Hard**, **Concentration**. Replaces v1's
single shared best score (constitution Section 3.3/4). The permanent
dictionary itself stays a single shared store across all three modes —
only best-score tracking splits per mode.

## Open before implementation

- Hard mode's exact mechanic (see above)
- Whether Concentration correct-matches award any permanent-dictionary
  effect (e.g. a mastery count bump) or stay purely session-local
- Grid size for Concentration (doesn't need to match the 4×4 Normal/Hard
  board — a memory game usually wants more pairs, e.g. a 4×4 or 6×6 grid
  of face-down cells)
