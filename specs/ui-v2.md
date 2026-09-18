# UI — v2

Referenced from `constitution.md`'s v2 checklist / Open Decisions Log.
Builds on `specs/ui-v1.md` (fonts, themes, tile labels, the v1/v1.5
dictionary panel) — this doc only covers what's new/changed for v2.

## Rules panel — DECIDED

A new onboarding panel/modal, accessible at any time (not just first
launch), covering:

- The game's objective in plain English (merge stem + ending tiles to
  conjugate; chain to past tense; no legal merge = game over)
- A translation of the `현재`/`과거` tile labels — a new player has no
  other in-game way to learn these mean "present" and "past"

Exact placement/trigger (first-launch auto-open vs. a persistent
"?"/help button, modal vs. drawer) is OPEN — pick whichever fits best
alongside the existing dictionary drawer (`specs/ui-v1.md`) without
competing for the same screen real estate.

## Dictionary UI enhancements — DECIDED

On top of the v1.5 docked drawer (`specs/ui-v1.md`'s Gloss/Dictionary
Panel sections), add:

- **Search** — filter the list by Korean word or English meaning as the
  player types
- **Filter** — DECIDED: a row of four pills, **All / Level 1 / Level 2 /
  ★ Starred**, folding the bookmark view into the same control rather
  than a separate dedicated tab (kept the drawer to one filter row instead
  of two, and Level became the natural dimension once Level 2 shipped)
- **Alphabetical sort** — DECIDED: Korean (Hangul) order via
  `word.localeCompare(other, 'ko')`, toggled against the existing "order
  learned" default (a `<select>`, not a separate control) — matches how a
  learner would look words up in a Korean dictionary
- **Bookmark/star feature** — DECIDED: a star toggle per dictionary row
  (☆/★), persisted as a `bookmarked` field on `DictionaryEntry`
  (`packages/core/src/dictionary.ts`), changed only by the new
  `toggleBookmark` function

These are additive to the existing row content (meaning, example
sentence, mastery count, speaker button) — no existing v1.5 row data is
removed.

## Dictionary panel color fix (Classic theme) — DECIDED

The Classic theme's dictionary panel ("digital tablet" treatment,
`specs/ui-v1.md`) currently doesn't fit the rest of Classic's palette
(`#FAF8EF`/`#BBADA0`/`#EEE4DA`/etc. — `specs/ui-v1.md` Theme 1 table) —
flagged as a visual bug to fix, not a v3 theming feature. Exact new
colors OPEN — restyle using Classic's existing token set/CSS custom
properties (per `specs/ui-v1.md`'s "define these as CSS custom
properties" convention) rather than one-off hard-coded values, so it
stays consistent if Classic's palette shifts later.
