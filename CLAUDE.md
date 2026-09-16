# CLAUDE.md — 2048 Hangul Conjugation

Reference for Claude Code when working in this project. `constitution.md`
in this folder is the source of truth for product/scope decisions — read it
before proposing features or architecture changes. This file is about *how*
to work here, not *what* to build.

## Spec-driven workflow

- `constitution.md` holds the vision, principles, and the versioned
  checklist (v1/v2/v3...). Treat unchecked boxes as the backlog and checked
  boxes as validated-done.
- Before starting work on an item, confirm which checklist item it maps to.
  Don't implement v2+ items while v1 boxes are still unchecked (Principle 5:
  ship the loop before the polish) unless the user explicitly asks to jump
  ahead.
- When a checklist item is genuinely done *and verified working* (not just
  code written — actually run/tested), check it off in `constitution.md` in
  the same session, and say so.
- If implementation reveals a decision the constitution left `OPEN` or
  didn't anticipate, resolve it with the user and update the relevant
  section of `constitution.md` rather than silently deciding and moving on
  — this doc needs to stay accurate as the plan evolves.
- Future feature work that needs more detail than the constitution carries
  (e.g. a full v2 grammar-engine spec) should live in `specs/` as its own
  doc, linked from the constitution — don't bloat the constitution itself
  with implementation-level detail.

## Repo / git

- This folder's git repo root is the user's home directory, not this
  folder. **Do not run `git add -A`, `git commit`, or any git command from
  here that isn't scoped to files under `2048/`** — the wider repo tracks
  unrelated personal files. If/when this project gets its own repo, this
  note should be deleted.

## Architecture (per constitution.md Section 5)

- `packages/core/` — framework-agnostic TypeScript. Board state, merge
  rules, the conjugation engine, scoring/dictionary logic. No React, no
  Next.js, no DOM APIs. This is what a future mobile app reuses — keep it
  that way.
- `apps/web/` — Next.js (App Router) + TypeScript + React, deployed on
  Vercel. Imports `packages/core`; owns rendering, input handling, and
  `localStorage` persistence.
- The conjugation engine is the correctness-critical part of this project
  (constitution Principle 1). It should have unit tests covering every word
  in the v1 vocab list × every supported ending, not just happy-path
  examples.

## Conventions

- TypeScript strict mode.
- No comments explaining *what* code does; only for non-obvious *why*
  (e.g. a specific Korean vowel-harmony rule or an irregular-class
  exception) — same bar as normal.
- Keep UI styling swappable rather than hard-coded, since theming is a
  named v3 feature — don't block that future work with one-off inline
  styles that assume a single look.
