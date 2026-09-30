# Accounts & cloud sync — v2.5 spec

Status: **DECIDED design, not implemented.** Supersedes the "Accounts +
cross-device progress sync" bullet that used to sit in v3, and amends
constitution Principle 2 (see there). Motivation: the Settings panel
(`specs/settings-v2.md`) has a name, stats, and a reset button, which only
make full sense once identity and data live somewhere durable.

## Stack — DECIDED: Supabase

- **Auth:** Supabase Auth, **email + password**. Password hashing, sessions,
  email verification and password reset are the provider's job — we never
  store or handle raw passwords. OAuth (Google, etc.) is a possible later
  addition, not in scope now.
- **Database:** Supabase Postgres, with **row-level security** so a user
  can only read/write their own rows.
- **Client:** `@supabase/supabase-js` in `apps/web` only. It works from a
  future Expo app too. `packages/core` gets **no** Supabase import
  (Principle 3) — it stays pure logic.
- **Hosting:** web stays on Vercel; Supabase env vars (URL + anon key) go
  in Vercel/`.env.local`. The anon key is public by design; RLS is the
  actual security boundary. The service-role key is never shipped to the
  client.
- Rejected: Auth.js + Neon (too much to assemble/secure ourselves),
  Clerk (two vendors, user-count-tied pricing), Firebase (NoSQL, lock-in).

## Identity

- **Username** is a unique display name, chosen at signup, shown in
  Settings and (later) on leaderboards. It is *not* the login credential —
  email is. (Considered username-only login: rejected, no recovery and it
  fights the auth provider.)
- **Guests** (signed out / never signed up) are labeled **`UserXXXX`**,
  where XXXX is a random 4-digit number generated once on first launch and
  stored in localStorage (`2048-hangul:guestId`). It is a label only, with
  no server identity and no uniqueness guarantee. Guests play fully
  offline exactly as today.
- On signup the chosen username replaces the guest label. If the chosen
  username is taken, the form errors; guest labels are never reserved.

## Data model (initial, Postgres)

- `profiles` — `id` (= auth user id), `username` (unique, 3–24 chars),
  `created_at`.
- `dictionary_entries` — `user_id`, `word`, `count`, `bookmarked`;
  primary key `(user_id, word)`.
- `best_scores` — `user_id`, `mode`, `score`; primary key `(user_id, mode)`.
- `session_records` — `user_id`, `mode`, `score`, `ended_at` (recent
  sessions for Settings analytics; keep capped like today's 20).
- `game_stats` — games-played counters per `(user_id, mode)`.
- In-progress board sessions (`sessionKey(mode)`) are **device-local** for
  now: not synced. Syncing a live board mid-game invites conflicts for
  little value.
- All tables: RLS on, policy `user_id = auth.uid()` for select/insert/
  update/delete.

## Guest → account migration — DECIDED

On first signup/login from a device holding guest data, upload the local
dictionary, best scores and stats into the account. Merge rules if the
account already has data (logging into an existing account from a device
with guest progress): dictionary — union of words, `count` = max of the
two (not sum, to avoid double-counting on repeated logins), `bookmarked`
= OR; best scores — max per mode; stats — take the account's values and
append guest sessions only once (migration is marked done in localStorage
so it cannot run twice). Guest local data is left in place after
migration; it just stops being the source of truth while signed in.

## Sync model

- Signed out: localStorage is the store (unchanged behavior).
- Signed in: server is the source of truth; localStorage acts as a cache
  so the game still plays offline and writes queue until reconnect.
- Introduce a small storage interface in `apps/web` (load/save dictionary,
  best scores, stats) with a localStorage implementation and a Supabase
  implementation, so game components stop calling `localStorage` directly.
  This refactor is the first step and is independent of the backend.
- Conflicts: last-write-wins per row is acceptable at this scale (solo
  user, 1–10 concurrent), with the max/union rules above for the
  monotonic fields (scores, counts).

## Settings page changes (follow-up to `specs/settings-v2.md`)

- Profile shows the username (`UserXXXX` for guests) plus Sign up / Log in
  when a guest, and Log out when signed in. The free-text name field goes
  away — username comes from the account.
- **Reset data** semantics need re-deciding once accounts exist: for a
  signed-in user, does it wipe the server copy too? Proposed: yes, behind
  a stronger confirmation that names the account; plus a separate
  "delete account" later. OPEN.

## Privacy / compliance

This is the first PII the project collects (email). Needs a short privacy
note, and email is stored only by Supabase Auth, never copied into our
tables. COPPA/GDPR surface stays minimal but is no longer zero — revisit
the constitution's Non-Functional Requirements when building.

## OPEN

- Email verification required before play, or only before sync?
- Do leaderboards (still v3) key off `username` publicly? Needs a public
  read policy on a view, not the raw tables.
- Reset/delete-account semantics (above).
- Supabase project region and free-tier pause behavior (free projects pause
  after inactivity) — acceptable for a hobby project?

## Suggested build order

1. Storage-interface refactor (no behavior change) + guest `UserXXXX`.
2. Supabase project, schema, RLS, env wiring.
3. Signup/login/logout UI in Settings.
4. Guest → account migration.
5. Server-backed reads/writes + offline cache.
6. Rework Settings profile/reset for accounts.
