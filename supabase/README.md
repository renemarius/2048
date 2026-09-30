# Supabase

Schema for accounts & cloud sync — design in `specs/accounts-v2.5.md`.

## Apply

Paste `migrations/0001_init.sql` into the Supabase dashboard's SQL editor
and run it once on a fresh project. (With the Supabase CLI: `supabase link`
then `supabase db push`.)

## Auth settings to match the spec

- Authentication → Providers → Email: enabled, **Confirm email ON**
  (writes are RLS-gated on a confirmed email).
- Signup passes `{ username }` as user metadata; the
  `on_auth_user_created` trigger turns it into a `profiles` row.

## Notes

- Never ship the service-role key to the client; only the URL and anon key
  go in `NEXT_PUBLIC_*` env vars.
- Deleting an auth user cascades to every table. Doing that from the app
  (Delete account) needs a server-side function — not built yet.
