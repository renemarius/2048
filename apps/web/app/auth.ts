'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { getSupabase } from './supabase-client';

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,24}$/;

export interface AuthState {
  /** False until the first session lookup finishes. */
  ready: boolean;
  /** Whether Supabase is configured at all; false means guest-only. */
  available: boolean;
  user: User | null;
  username: string | null;
  verified: boolean;
}

export function useAuth(): AuthState {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const supabase = getSupabase();

  const loadUsername = useCallback(
    async (id: string) => {
      const { data } = await supabase!.from('profiles').select('username').eq('id', id).maybeSingle();
      setUsername(data?.username ?? null);
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) {
      setReady(true);
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (user) void loadUsername(user.id);
    else setUsername(null);
  }, [user, loadUsername]);

  return {
    ready,
    available: supabase !== null,
    user,
    username: username ?? (user?.user_metadata?.username as string | undefined) ?? null,
    verified: !!user?.email_confirmed_at,
  };
}

export type AuthResult = { ok: true; message?: string } | { ok: false; error: string };

export async function signUp(email: string, password: string, username: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Accounts are not configured.' };
  if (!USERNAME_PATTERN.test(username)) {
    return { ok: false, error: 'Username must be 3–24 letters, numbers or underscores.' };
  }
  if (/^user\d{4}$/i.test(username)) {
    return { ok: false, error: 'That username is reserved for guests.' };
  }
  const { data: available } = await supabase.rpc('username_available', { candidate: username });
  if (available === false) return { ok: false, error: 'That username is taken.' };

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username } },
  });
  if (error) return { ok: false, error: error.message };
  // Supabase returns an empty identities list (no error) for an email that
  // is already registered, to avoid leaking which emails have accounts.
  if (data.user && data.user.identities?.length === 0) {
    return { ok: false, error: 'An account with that email may already exist — try logging in.' };
  }
  return data.session
    ? { ok: true }
    : { ok: true, message: 'Check your email to confirm your account, then log in.' };
}

export async function logIn(email: string, password: string): Promise<AuthResult> {
  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'Accounts are not configured.' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function logOut(): Promise<void> {
  await getSupabase()?.auth.signOut();
}
