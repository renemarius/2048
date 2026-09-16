# UI & Visual Design — v1

Referenced from `constitution.md` Sections 3.3, 6, and the v1 checklist.
Covers font, color, and the functional layout for v1 — full theme gallery
and mobile-specific UI are v3 (constitution Section 7).

## Font — DECIDED

**Noto Sans KR**, covering Hangul and Latin glyphs in one family so Korean
tile text and English UI chrome (score, buttons, gloss) pair naturally
without a second typeface.

Implementation note (discovered during scaffolding): `next/font/google`
cannot self-host this font — Next's bundled Google Fonts metadata has no
CJK subsets for *any* font, since Korean/Japanese/Chinese-script fonts
aren't distributed as small subset files the way Latin scripts are. Loaded
instead via a standard `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR...">`
in `apps/web/app/layout.tsx`, with `font-family: 'Noto Sans KR', sans-serif`
in `globals.css`. Functionally identical for the player; just skips
next/font's self-hosting/zero-layout-shift optimization.

## Theme scope for v1 — DECIDED

v1 ships with exactly **two built-in themes**, switchable at runtime and
persisted to `localStorage`. This is a deliberate middle ground: not zero
visual direction (bad for a first playable), not the full v3 theme gallery
(pastel/gothic/neon/monotone — real scope for a later version). "Classic"
is the default on first load.

### Theme 1 — Classic (default)

Original-2048-inspired warm neutrals.

| Role | Value |
|---|---|
| Page background | `#FAF8EF` |
| Board background | `#BBADA0` |
| Empty cell | `#CDC1B4` |
| Stem tile | `#EEE4DA` (text `#776E65`) |
| Ending tile | `#F2B179` (text `#FFFFFF`) |
| Word tile — present stage | `#F59563` (text `#FFFFFF`) |
| Word tile — past stage (final) | `#E2543A` (text `#FFFFFF`) |
| Body/UI text | `#776E65` |

### Theme 2 — Modern ink & paper (alternate)

Calmer, editorial palette with a Korean seal-ink/celadon accent pair.

| Role | Value |
|---|---|
| Page background | `#F7F5F1` |
| Board background | `#E8E4DC` |
| Empty cell | `#DCD7CC` |
| Stem tile | `#DCD7CC` (text `#2B2B2B`) |
| Ending tile | `#B33A3A` — seal-ink red (text `#FFFFFF`) |
| Word tile — present stage | `#A9C4B8` — light celadon (text `#2B2B2B`) |
| Word tile — past stage (final) | `#7A9E8E` — deep celadon (text `#FFFFFF`) |
| Body/UI text | `#2B2B2B` |

### Tile-type color semantics (applies in both themes)

The four roles above (stem / ending / word-present / word-past) are a
**functional** requirement, not just decoration — they're how a player
tells tile type and conjugation progress apart at a glance:

- **Stem** — neutral/muted (the "raw material" not yet combined)
- **Ending** — the most saturated/attention-grabbing color (the "active
  ingredient" you're looking to combine with a stem)
- **Word, present stage** — a distinct mid-tone signaling "combined, but
  not final"
- **Word, past stage** — the deepest/most saturated word color, signaling
  "this word is complete" (this is also the +50 dictionary-bonus moment)

Implementation note: define these as CSS custom properties per theme
(e.g. `--tile-stem`, `--tile-ending`, `--tile-word-present`,
`--tile-word-past`) rather than hard-coded per-component colors, so adding
a third theme later (v3) is a matter of defining one more variable set,
not touching component code (constitution Principle 5 / Section 5 styling
note).

## Gloss (English meaning) display — DECIDED

**Board tiles show Korean only — no English gloss on the board itself.**
This preserves the fast, clean, "pure 2048" feel of the board and treats
meaning-lookup as a deliberate, separate action rather than something
passively visible during play.

Consequence: this requires a **minimal dictionary panel in v1** (pulled
forward from what was originally a v2-only "browse UI" item) — without
somewhere to see meanings, a Korean-learning game with no gloss anywhere
would defeat its own purpose. Scope split:

- **v1 (this spec):** a simple toggleable panel/modal listing every
  `(Korean word, English meaning)` pair in the permanent dictionary so
  far, in a fixed order (e.g. order learned). No search, filter, or stats.
- **v2 (constitution roadmap):** enhance that same panel with
  search/filter and any learning stats, on top of the v1 version — not a
  rebuild.

## Dictionary Panel Visual Treatment — DECIDED

The two v1 themes don't just recolor the dictionary panel — each gets a
distinct physical metaphor matching its overall mood.

### Classic theme → "digital tablet" panel

The energetic, arcade-like Classic theme gets a panel that reads as a
handheld device displaying the word list:

- Panel rendered inside a device-style frame: thick dark bezel
  (`#2B2B2B`–`#1A1A1A`), rounded corners larger than the board tiles', a
  slightly thicker bottom margin to suggest a tablet "chin."
- Inside the bezel, a "screen" area with a subtly deeper/cooler background
  than the page (e.g. `#3A3A3A` or a dark gradient) so entries read as lit
  text on a screen. Rows separated by thin dividers, laid out like a
  simple app list (Korean word left, gloss right or below).
- Optional decorative top strip mimicking a status bar (a couple of small
  dots/an icon) — purely cosmetic; skip first if it's not worth the build
  time.
- No new font family — stays on Noto Sans KR; lean on weight/size contrast
  for the "device UI" feel rather than typography changes.

### Modern ink & paper theme → literal notebook-paper panel

The calmer Modern theme's panel is styled as a physical page of notebook
paper:

- Panel background uses the theme's paper tone (`#F7F5F1`) with subtle
  horizontal ruled lines (light blue-grey, e.g. `#C9D6E3`) behind each
  row — classic lined-notebook look.
- A vertical margin line in muted red/pink (`#D98A8A`) near the left edge,
  the standard ruled-notebook convention — purely decorative.
- Soft drop shadow / slightly uneven edge on the panel to read as a
  lifted physical sheet rather than a flat UI surface.
- Word entries sit "written" on the ruled lines — Korean word + gloss per
  line, in the theme's existing ink-toned text color (`#2B2B2B`).
- Same rule as Classic: no new font family for v1. A handwriting-style
  accent font is a fine v3-polish idea, not a v1 requirement.

### Implementation note

Scope this skinning to the dictionary panel component only (background,
borders, decorative pseudo-elements) and have it consume the same CSS
custom properties/theme tokens as the rest of the UI, rather than
introducing a parallel styling system — keeps Principle 5's "theming stays
swappable" intact: a future third theme only needs one more token set,
panel included.

## v1 functional UI components — DECIDED baseline

- **Board** — 4×4 grid, tile slide/merge animation on move (arrow keys and
  WASD both bound to the same four directions)
- **Header** — current session score, persisted best score
- **Restart / new game** button — resets the board and session score;
  does not touch the permanent dictionary or best score
- **Theme toggle** — switches Classic ⇄ Modern ink & paper, persisted in
  `localStorage`
- **Minimal dictionary panel** — toggle open/closed; lists learned words +
  meanings (see above), skinned per active theme as "digital tablet"
  (Classic) or "notebook paper" (Modern ink & paper) — see Dictionary
  Panel Visual Treatment above
- **"New word" toast** — brief on-screen notification when a base word
  hits its past-stage form for the first time ever (the +50 bonus moment)
  — this is the single most important feedback moment in the game and
  should be the most visually distinct event on screen
- **Game-over modal** — appears when no legal merge remains anywhere on
  the board; shows final session score vs. best score, offers restart
- **Responsive layout** — the web v1 layout should not assume desktop-only
  width, even though mobile packaging itself is v3 (constitution
  Principle 3) — costs little now, avoids rework later

## Open for build-time tuning

Exact hex values above are a first pass, chosen for contrast/legibility
and thematic fit — not precious. Fine to adjust once the board is actually
rendering and colors can be judged in context, as long as the four
tile-type roles stay visually distinct from each other within whichever
theme is active.
