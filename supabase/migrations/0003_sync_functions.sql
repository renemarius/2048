-- Server-side pieces for cloud sync (specs/accounts-v2.5.md).
--
-- The sync RPCs are SECURITY INVOKER on purpose: they run as the caller, so
-- the RLS policies from 0001 (owner-only, verified email to write) still
-- apply. They exist so multi-device races resolve on the server
-- (greatest / increment) instead of last-write-wins from a stale client.

-- Dictionary order = when a word was first learned.
alter table public.dictionary_entries
  add column if not exists learned_at timestamptz not null default now();

-- p_entries: [{ "word": text, "count": int, "bookmarked": bool }, ...] in
-- learned order. Existing words keep their learned_at and never lose count.
create or replace function public.upsert_dictionary(p_entries jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.dictionary_entries (user_id, word, count, bookmarked, learned_at)
  select
    (select auth.uid()),
    t.value ->> 'word',
    greatest((t.value ->> 'count')::integer, 1),
    coalesce((t.value ->> 'bookmarked')::boolean, false),
    now() + (t.ord * interval '1 millisecond')
  from jsonb_array_elements(p_entries) with ordinality as t(value, ord)
  on conflict (user_id, word) do update
    set count = greatest(public.dictionary_entries.count, excluded.count),
        bookmarked = excluded.bookmarked;
end;
$$;

create or replace function public.upsert_best_score(p_mode text, p_score integer)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.best_scores (user_id, mode, score)
  values ((select auth.uid()), p_mode, p_score)
  on conflict (user_id, mode) do update
    set score = greatest(public.best_scores.score, excluded.score);
end;
$$;

-- One finished game: a session row plus a games-played increment.
create or replace function public.record_session(
  p_mode text,
  p_score integer,
  p_ended_at timestamptz default now()
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.session_records (user_id, mode, score, ended_at)
  values ((select auth.uid()), p_mode, p_score, p_ended_at);

  insert into public.game_stats (user_id, mode, games_played)
  values ((select auth.uid()), p_mode, 1)
  on conflict (user_id, mode) do update
    set games_played = public.game_stats.games_played + 1;
end;
$$;

-- Guest → account: add the guest's games-played counters and recent
-- sessions to the account. The client runs this once per device+account
-- (marker in localStorage).
--   p_games:    { "normal": 3, "hard": 0, ... }
--   p_sessions: [{ "mode": text, "score": int, "endedAt": epoch-ms }, ...]
create or replace function public.import_guest_stats(p_games jsonb, p_sessions jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  m text;
  n integer;
  s jsonb;
begin
  foreach m in array array['normal', 'hard', 'concentration', 'connectives'] loop
    n := least(greatest(coalesce((p_games ->> m)::integer, 0), 0), 100000);
    if n > 0 then
      insert into public.game_stats (user_id, mode, games_played)
      values ((select auth.uid()), m, n)
      on conflict (user_id, mode) do update
        set games_played = public.game_stats.games_played + excluded.games_played;
    end if;
  end loop;

  for s in
    select value from jsonb_array_elements(coalesce(p_sessions, '[]'::jsonb)) limit 20
  loop
    insert into public.session_records (user_id, mode, score, ended_at)
    values (
      (select auth.uid()),
      s ->> 'mode',
      (s ->> 'score')::integer,
      to_timestamp(((s ->> 'endedAt')::numeric) / 1000.0)
    );
  end loop;
end;
$$;

-- Delete account. SECURITY DEFINER because callers can't touch auth.users;
-- it only ever deletes the caller's own row, and every data table cascades
-- from it.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.upsert_dictionary(jsonb) from public;
revoke all on function public.upsert_best_score(text, integer) from public;
revoke all on function public.record_session(text, integer, timestamptz) from public;
revoke all on function public.import_guest_stats(jsonb, jsonb) from public;
revoke all on function public.delete_my_account() from public;

grant execute on function public.upsert_dictionary(jsonb) to authenticated;
grant execute on function public.upsert_best_score(text, integer) to authenticated;
grant execute on function public.record_session(text, integer, timestamptz) to authenticated;
grant execute on function public.import_guest_stats(jsonb, jsonb) to authenticated;
grant execute on function public.delete_my_account() to authenticated;
