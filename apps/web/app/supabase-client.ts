// Browser Supabase client (specs/accounts-v2.5.md). Only the public URL and
// anon/publishable key are used here — RLS is the security boundary. When
// the env vars are missing the app simply stays guest-only.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}
