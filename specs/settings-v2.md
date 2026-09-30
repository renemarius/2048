# Settings — v2 spec

Constitution v2 checklist item "Settings page". Resolves the OPEN analytics
question with the user.

## Placement — DECIDED

A modal panel (same overlay/card family as the Rules panel), opened by a
"Settings" button in the header of every mode's screen. It replaces the
old main-screen theme toggle. No routing.

## Sections

1. **Profile**
   - **Name** — free text, persisted (`2048-hangul:profileName`), max 24
     chars. Purely local; shown nowhere else yet.
   - **Best scores** — Normal / Hard / Concentration / Sentences (the
     existing `bestScoreKey(mode)` tracks).
   - **Analytics** (local, on-device only — no tracking of any kind):
     - *Words learned*: total, Level 1 count, Level 2 count (derived from
       the dictionary).
     - *Mastery*: total conjugations (sum of counts), most-drilled word,
       starred count (derived from the dictionary).
     - *Games played*: per mode. A game counts when it ends (Normal/Hard
       game over, Concentration all pairs matched, Sentences session
       complete) **or** is abandoned via restart/new game with score > 0.
       New tracking; starts at 0 for existing players.
     - *Points per session*: the last 20 finished sessions (mode, score),
       newest first, plus average score. Stored in
       `2048-hangul:stats`.
2. **Themes** — pick among the existing themes (Classic / Modern). The
   full gallery stays a v3 item.
3. **Reset data** — wipes every `2048-hangul:*` key plus `theme`
   (dictionary, sessions, best scores, stats, name, rules-seen). DECIDED:
   no selectable scope. Two-step confirmation; reloads the page after.

## Implementation notes

- Pure logic (session recording, dictionary-derived stats) lives in
  `packages/core/src/stats.ts`, unit tested. The web layer only does
  storage and rendering.
- While Settings is open, Normal/Hard board keys are ignored (the name
  input would otherwise move tiles on W/A/S/D).
