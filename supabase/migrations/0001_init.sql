-- Accounts & cloud sync schema (specs/accounts-v2.5.md).
-- Run in the Supabase SQL editor, or `supabase db push` with the CLI.
--
-- Every table is owned by one user and locked down with row-level security:
-- the anon key is public by design, so RLS is the actual security boundary.
-- Writes additionally require a confirmed email ("verify before syncing").

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

-- SECURITY DEFINER because auth.users isn't readable by the caller. Returns
-- false for anon (auth.uid() is null). Wrapped in (select ...) inside
-- policies so Postgres evaluates it once per statement, not per row.
create or replace function public.is_email_verified()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = auth.uid() and email_confirmed_at is not null
  );
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[A-Za-z0-9_]{3,24}$'),
  -- Guest labels (UserXXXX) are a client-side fallback; don't let a real
  -- account impersonate one.
  constraint username_not_guest_label check (username !~* '^user[0-9]{4}$')
);

-- Case-insensitive uniqueness: "Rene" and "rene" are the same name.
create unique index profiles_username_lower_key on public.profiles (lower(username));

alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- No insert policy: rows are created only by the signup trigger below.
-- No delete policy: rows go away when the auth user is deleted (cascade).

-- Signup form passes { username } as user metadata; this turns it into a
-- profile row. A bad or taken username raises and aborts the signup, so no
-- account is ever left without a profile.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data ->> 'username');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the signup form check a name before submitting. Returns only a
-- boolean, so it doesn't expose the profiles table to anon.
create or replace function public.username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(candidate)
  );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- dictionary_entries — one row per learned word
-- ---------------------------------------------------------------------

create table public.dictionary_entries (
  user_id uuid not null references auth.users (id) on delete cascade,
  word text not null check (char_length(word) between 1 and 32),
  count integer not null check (count >= 1),
  bookmarked boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, word)
);

-- ---------------------------------------------------------------------
-- best_scores — one row per (user, mode)
-- ---------------------------------------------------------------------

create table public.best_scores (
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('normal', 'hard', 'concentration', 'connectives')),
  score integer not null check (score >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, mode)
);

-- ---------------------------------------------------------------------
-- game_stats — games-played counter per (user, mode)
-- ---------------------------------------------------------------------

create table public.game_stats (
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('normal', 'hard', 'concentration', 'connectives')),
  games_played integer not null default 0 check (games_played >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, mode)
);

-- ---------------------------------------------------------------------
-- session_records — recent finished sessions (capped at 20 per user,
-- matching MAX_RECENT_SESSIONS in packages/core/src/stats.ts)
-- ---------------------------------------------------------------------

create table public.session_records (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  mode text not null check (mode in ('normal', 'hard', 'concentration', 'connectives')),
  score integer not null check (score >= 0),
  ended_at timestamptz not null default now()
);

create index session_records_user_ended_idx
  on public.session_records (user_id, ended_at desc);

create or replace function public.prune_session_records()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.session_records
  where user_id = new.user_id
    and id not in (
      select id from public.session_records
      where user_id = new.user_id
      order by ended_at desc, id desc
      limit 20
    );
  return null;
end;
$$;

create trigger prune_session_records_after_insert
  after insert on public.session_records
  for each row execute function public.prune_session_records();

-- ---------------------------------------------------------------------
-- RLS for the four data tables: owner-only, writes need a verified email.
-- Reads deliberately don't require verification, so a user who hasn't
-- confirmed yet still sees an empty (not erroring) result.
-- ---------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['dictionary_entries', 'best_scores', 'game_stats', 'session_records']
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      'create policy %I on public.%I for select to authenticated
         using (user_id = (select auth.uid()))',
      t || ': read own', t);

    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (user_id = (select auth.uid()) and (select public.is_email_verified()))',
      t || ': insert own', t);

    execute format(
      'create policy %I on public.%I for update to authenticated
         using (user_id = (select auth.uid()) and (select public.is_email_verified()))
         with check (user_id = (select auth.uid()) and (select public.is_email_verified()))',
      t || ': update own', t);

    -- Delete isn't gated on verification: "Reset data" must always work.
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (user_id = (select auth.uid()))',
      t || ': delete own', t);
  end loop;
end;
$$;

-- Keep updated_at honest without trusting the client.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger dictionary_entries_touch before update on public.dictionary_entries
  for each row execute function public.touch_updated_at();
create trigger best_scores_touch before update on public.best_scores
  for each row execute function public.touch_updated_at();
create trigger game_stats_touch before update on public.game_stats
  for each row execute function public.touch_updated_at();
