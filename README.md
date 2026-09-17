# 2048 Hangul Conjugation

A 2048-style tile game where merging tiles conjugates Korean verbs and
adjectives instead of adding numbers — built to help A1–A2 Korean learners
absorb vocabulary and conjugation patterns through play.

Stem tiles (dictionary-form verbs/adjectives, e.g. `가다`) merge with
ending tiles (`현재`/`과거`) to produce conjugated word tiles (`가요` →
`갔어요`), chaining the way 2/4/8 chains in classic 2048. See
[`constitution.md`](constitution.md) for the full design, scope, and
versioned checklist, and [`specs/`](specs) for detailed sub-specs
(vocabulary list, UI).

## Project structure

This is an npm-workspaces monorepo:

- [`packages/core`](packages/core) — framework-agnostic TypeScript: board
  state, merge rules, the conjugation engine, scoring/dictionary logic. No
  React, no Next.js, no DOM APIs.
- [`apps/web`](apps/web) — the Next.js (App Router) + React app that
  imports `packages/core` and handles rendering, input, and `localStorage`
  persistence.

## Getting started

Requires Node.js and npm.

```bash
npm install
npm run dev
```

This starts the Next.js dev server for `apps/web` (default
http://localhost:3000).

## Scripts (run from the repo root)

| Command | What it does |
|---|---|
| `npm run dev` | Start the web app's dev server |
| `npm run build` | Production build of the web app |
| `npm run start` | Serve the production build |
| `npm run test` | Run `packages/core`'s unit test suite (Vitest) |
| `npm run typecheck` | Type-check both `packages/core` and `apps/web` |

## Tech stack

- Next.js (App Router) + TypeScript + React
- Vitest for `packages/core` unit tests
- `localStorage` for all persistence (no backend, no database — see
  `constitution.md` Principle 2)
- Deployed on Vercel
