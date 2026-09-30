-- Newer Supabase projects don't auto-grant table privileges to the API
-- roles, so without this even a signed-in user gets "permission denied
-- (42501)". Grants are the coarse gate; the RLS policies from 0001 still
-- decide which rows each user can touch. `anon` deliberately gets nothing.

grant usage on schema public to authenticated;

grant select, update on public.profiles to authenticated;

grant select, insert, update, delete on public.dictionary_entries to authenticated;
grant select, insert, update, delete on public.best_scores to authenticated;
grant select, insert, update, delete on public.game_stats to authenticated;
grant select, insert, delete on public.session_records to authenticated;

-- session_records.id is an identity column; inserts need its sequence.
grant usage, select on all sequences in schema public to authenticated;
