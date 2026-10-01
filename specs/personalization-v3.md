# v3 — Personalization & polish

Scope for the v3 milestone in `constitution.md` Section 7. Covers three
items: theme gallery, achievements, and leaderboards. A daily challenge
was considered and **dropped** (user decision) — no seeded RNG, no daily
mode, nothing in this spec depends on one. The mobile app (Expo) is **out of this spec** — it gets its own spec when
it's picked up. v3 stays one milestone (no v3.1/v3.2 split); the order
below is the suggested build order, not separate releases.

Status legend as in the constitution: `DECIDED` / `OPEN`.

Build order: **themes → achievements → leaderboards.** Themes are
self-contained; leaderboards go last since they need the account/sync
work to be settled.

---

## 1. Theme gallery

### Decided

- **Fixed preset gallery.** The player picks from curated themes; no
  custom color editor, no unlockable themes (both considered and cut —
  an editor needs contrast validation, unlocks couple themes to the
  achievements system for little gain).
- **Mechanism stays CSS tokens.** Each theme is one `[data-theme='x']`
  block in `apps/web/app/globals.css` overriding the same token set Classic
  and Modern already override (`--page-bg`, `--board-bg`, `--cell-empty`,
  `--tile-*` + `-text`, `--ui-text`, `--feedback-*`, `--dict-*`). No
  component should need to know which theme is active.
- **Selection UI** stays in Settings → Theme, upgraded from two buttons to
  a grid of swatch cards (the theme's board color with its five tile colors).
- **Persistence** unchanged: `localStorage` `theme` key, applied on load by
  `theme.ts`. Theme is device-local and not synced (like today).
- Unknown/removed stored theme id falls back to `classic`.

### Roster — DECIDED (six new themes)

Palettes live in `packages/core/src/themes.ts` (`THEMES`) — the single
source of truth. `apps/web/app/layout.tsx` generates the CSS blocks from it
(`themeCss()`), so there is no hand-maintained duplicate in `globals.css`.
Neon/gothic from the first draft were replaced by the user's picks.

| id | Feel | Tile mapping (stem / ending / present / past / future) |
|---|---|---|
| `classic` | existing | unchanged |
| `modern` | existing ink & paper | unchanged (keeps its notebook-paper dictionary skin) |
| `monochrome` | light page, black board | five-step grey lightness ramp, light → dark |
| `pastel` | soft candy | cream / pink / sky / mint / lavender, dark plum text |
| `rgb` | dark, gaming | slate / **red** / **green** / **blue** / amber |
| `tech` | terminal / cyberpunk | slate / cyan / green / orange / violet on near-black, green dictionary text |
| `cat` | warm tabby | cream / nose pink / tabby orange / grey cat / black cat on a brown board |
| `dog` | outdoorsy | bone / golden / brown fur / leash blue / collar red on a grass-green board |

Cat and dog are **palette-themed only** (colors, plus an emoji in the
picker) — no illustrations, paw-print backgrounds or sound effects. Those
would be a different kind of asset work (art, licensing) and aren't
needed to ship the gallery.

All themes use the generic dictionary skin built from `--dict-*` tokens
except `modern`, which keeps its bespoke notebook skin. (Resolves the
earlier OPEN item.)

### Requirements

- **Tile types must stay distinguishable** — stem / ending / present /
  past / future each need a visibly different tile color in every theme,
  including `monotone` (use a lightness ramp, not hue). This is a
  correctness-of-UX issue: the tile color is how a player reads what a
  tile *is*.
- **Contrast:** tile text against tile background ≥ 4.5:1 (WCAG AA), plus
  page text, dictionary text, and ≥ 3:1 for feedback colors on the page —
  enforced by `themes.test.ts` in `packages/core` for every theme except
  Classic and Modern, whose palettes predate the bar (white text on
  Classic's orange tiles is ~2:1) and are deliberately left untouched.
  `board-text` (text on the board and empty cells: score boxes, mode/theme
  buttons, Sentences answer row and bank) must meet 4.5:1 on both
  `board-bg` and `cell-empty`. Tile types must also be pairwise distinct (CIE76 ΔE ≥ 15) and distinct from
  the board.
- **No flash of wrong theme** on load: an inline script in `<head>`
  (`layout.tsx`) sets `data-theme` from `localStorage` before first paint.

### Tests / verification

- `themes.test.ts`: every theme defines every token; contrast and
  distinctness for the six new themes.
- Hands-on (cannot be automated): each theme × each of the four modes ×
  dictionary drawer × Settings × rules panel, at phone width — especially
  the dark themes (`rgb`, `tech`), where borders, shadows and modals were
  designed against light backgrounds.

---

## 2. Achievements

### Decided

- **Local-computable, then synced.** Achievements are derived from data
  that already exists (dictionary, best scores, stats), so the unlocked set
  can be recomputed — but each unlock needs a **timestamp** and a one-time
  toast, so unlocked achievements are stored (`id → unlockedAt`).
- **Pure logic in `packages/core/src/achievements.ts`:** a static
  `ACHIEVEMENTS` table (`id`, title, description, `check(progress)`) and
  `evaluateAchievements(progress, alreadyUnlocked) → newlyUnlocked[]`.
  No DOM/React. Exhaustively unit tested per achievement (boundary:
  one-below does not unlock, exactly-at does).
- **Sync:** same pattern as the dictionary — union on merge, earliest
  `unlockedAt` wins, never un-unlock. New table `achievements`
  (`user_id`, `achievement_id`, `unlocked_at`) with RLS + grants + an
  `upsert_achievements` function, as migration `0004`. Guests store
  locally and migrate on signup like other progress.
- **UI:** an "Achievements" section in Settings (grid: locked ones
  greyed with the description visible so players know what to aim for)
  and a toast on unlock, reusing the existing "new word" toast style.
  No dedicated route.

### Categories — DECIDED; exact tiers OPEN

Every achievement must be checkable from synced data. Three categories,
in the user's words: words mastered, login streak, and similar.

| Category | Examples (thresholds tunable) |
|---|---|
| **Words learned** (dictionary size) | 1 first word; 10 / 25 / 50; Level 1 complete (62); Level 2 complete; all 96 |
| **Words mastered** (a word's mastery count `×N`) | any word ×5 / ×10; 5 / 15 / 30 words at ×3 |
| **Login streak** | 3 / 7 / 30 consecutive days |
| **Score** | 1,000 / 5,000 / 10,000 in Normal; 1,000 in Hard |
| **Modes** | play each of the four modes once; a 10/10 Sentences session; a ×3 streak |

- **"Mastered" = mastery count ≥ 3** for the group tiers (count already
  lives on `DictionaryEntry`).
- **Login streak = consecutive local calendar days on which the app was
  opened**, recorded as `activeDays` (last ~60 ISO dates, device-local
  timezone) — and unioned across devices on sync. Guests accumulate it
  too so the streak survives signup; the achievement is simply labelled
  "login streak" because that's what players call it. OPEN: whether it should
  require *playing a game* that day instead of merely opening the app
  (lean: opening is enough — it's the cheaper, less punishing rule).
- `activeDays` is the one new persisted input; everything else derives from
  existing state.
- No achievement grants points, unlocks content, or changes gameplay.

### OPEN

- Final tier thresholds and list size (aim for ~20 so each one matters).
- Hidden/secret achievements: default no, all visible.

---

## 3. Leaderboards

### Decided

- **Public data exposed:** username + best score only, through a
  read-only view; underlying tables stay private under RLS (as already
  committed in `specs/accounts-v2.5.md`). Nothing else is shown — no
  dictionary, stats, or achievements.
- **One board kind: all-time best score**, ranked from the already-synced
  `best_scores` rows. Because best scores are tracked per mode (Normal /
  Hard / Concentration / Sentences), the modal has one tab per mode, each
  a plain ranking. (If a single combined board was intended instead,
  say so — it would need a rule for summing/choosing across modes.)
- **Anyone can view**, including signed-out visitors and guests — DECIDED.
  The view is granted `select` to `anon` as well as `authenticated`, and
  the modal needs no session. Only **appearing** on a board requires a
  verified-email account (same gate as sync); guests have no username and
  see a "sign up to get on the board" prompt instead of a "your rank" row.
- **Opt-out:** a Settings toggle "Show me on leaderboards" (default **on**
  for accounts, since the username is already a deliberate public display
  name). Off excludes the user from the view. Column
  `profiles.show_on_leaderboards boolean not null default true`.
- **UI:** a "Leaderboards" modal opened from the header (same pattern as
  Settings/rules): top 20 per mode plus a "your rank" row. No pagination
  in the first cut.
- **Cheating:** accepted, consistent with Section 4 of the constitution
  ("no cheat prevention needed"). Scores are client-reported; with no
  seeded/replayable game there is no cheap server verification, so this
  is a known limitation, not a v3 item.
- Supabase free-tier pausing (accepted in v2.5) can make leaderboards
  unavailable; the UI shows a "leaderboards unavailable" state and
  gameplay never depends on it.

### Consequence of anon access

The view must expose **only** `username` and score columns (never user
ids or emails), and be capped (top 20 per mode) so it can't be used to
scrape every account. An `anon`-readable view is a new public surface;
verify with the same anon-vs-authenticated checks used for `0002`.

---

## 5. Cross-cutting

- **Principle 3:** achievement evaluation lives in `packages/core` with
  tests. Supabase and
  localStorage stay in `apps/web`.
- **New migrations:** `0004` (achievements + played days + leaderboard
  opt-out + view + grants). Each new table gets RLS **and**
  explicit grants to `authenticated` only (lesson from `0002_grants.sql`);
  the leaderboard view grants `select` to both `anon` and `authenticated`
  (public by decision); the data tables remain private.
- **Reset / Delete account:** Reset must also clear achievements and played
  days (server + local); Delete cascades via the FKs.
- **Settings reorg:** Settings is already long; with Themes grid +
  Achievements it likely needs sections/tabs. Decide at build time.

## 6. Checklist (mirrors the constitution)

- [x] Theme gallery: 6 new themes, swatch picker, contrast + token
      completeness tests, no-flash load
- [ ] Achievements: core table + evaluator + tests, `activeDays`, sync
      (`0004`), Settings grid + unlock toast
- [ ] Leaderboards: view, opt-out, all-time modal (tab per mode)
- [ ] Hands-on pass across all of the above
