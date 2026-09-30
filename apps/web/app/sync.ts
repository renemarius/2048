'use client';

// Cloud sync for a signed-in, email-verified user (specs/accounts-v2.5.md).
//
// localStorage stays the synchronous surface the game reads and writes
// (progress-store.ts); this layer mirrors it to Supabase in the background.
// Guests never touch the network. Pure merge rules live in
// packages/core/src/sync.ts.

import { useSyncExternalStore } from 'react';
import type { DictionaryEntry, PlayerStats, StatsMode } from 'core';
import {
  STATS_MODES,
  emptyBestScores,
  mergeBestScores,
  mergeDictionaries,
  statsFromServer,
  type BestScores,
} from 'core';
import { clearAllLocalData } from './identity';
import {
  DICTIONARY_KEY,
  STATS_KEY,
  localProgressStore,
  setProgressStore,
  type ProgressStore,
} from './progress-store';
import { bestScoreKey, LEGACY_BEST_SCORE_KEY, LEGACY_SESSION_KEY, sessionKey } from './storage-keys';
import { getSupabase } from './supabase-client';

const OUTBOX_KEY = '2048-hangul:syncOutbox';
const DIRTY_KEY = '2048-hangul:syncDirty';
const MARKER_KEY = '2048-hangul:syncedUser';
const PUSH_DEBOUNCE_MS = 1500;

interface OutboxItem {
  mode: StatsMode;
  score: number;
  endedAt: number;
}

export type SyncStatus = 'off' | 'syncing' | 'synced' | 'error';

let activeUserId: string | null = null;
let status: SyncStatus = 'off';
let running: Promise<void> | null = null;
let rerun = false;
let pushTimer: number | null = null;
let listening = false;
const listeners = new Set<() => void>();

function setStatus(next: SyncStatus) {
  if (status === next) return;
  status = next;
  listeners.forEach((l) => l());
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => status,
    () => 'off' as SyncStatus,
  );
}

function readOutbox(): OutboxItem[] {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(OUTBOX_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOutbox(items: OutboxItem[]) {
  try {
    if (items.length === 0) window.localStorage.removeItem(OUTBOX_KEY);
    else window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  } catch {
    // best-effort; the session is still in local stats
  }
}

function isDirty(): boolean {
  try {
    return window.localStorage.getItem(DIRTY_KEY) === '1' || readOutbox().length > 0;
  } catch {
    return false;
  }
}

function setDirty(value: boolean) {
  try {
    if (value) window.localStorage.setItem(DIRTY_KEY, '1');
    else window.localStorage.removeItem(DIRTY_KEY);
  } catch {
    // see writeOutbox
  }
}

function hasMarker(userId: string): boolean {
  try {
    return window.localStorage.getItem(MARKER_KEY) === userId;
  } catch {
    return false;
  }
}

function setMarker(userId: string) {
  try {
    window.localStorage.setItem(MARKER_KEY, userId);
  } catch {
    // worst case the guest-stats import repeats; see reconcile
  }
}

function loadLocalBests(): BestScores {
  const bests = emptyBestScores();
  for (const mode of STATS_MODES) bests[mode] = localProgressStore.loadBestScore(mode);
  return bests;
}

function schedulePush() {
  if (!activeUserId) return;
  if (pushTimer !== null) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => {
    pushTimer = null;
    void syncNow(false);
  }, PUSH_DEBOUNCE_MS);
}

// Wraps the local store: same synchronous reads/writes, plus queuing work
// for the background push while signed in.
export const syncedProgressStore: ProgressStore = {
  loadDictionary: () => localProgressStore.loadDictionary(),
  saveDictionary(entries) {
    localProgressStore.saveDictionary(entries);
    if (activeUserId) {
      setDirty(true);
      schedulePush();
    }
  },
  loadBestScore: (mode) => localProgressStore.loadBestScore(mode),
  saveBestScore(mode, value) {
    localProgressStore.saveBestScore(mode, value);
    if (activeUserId) {
      setDirty(true);
      schedulePush();
    }
  },
  loadStats: () => localProgressStore.loadStats(),
  recordFinishedSession(mode, score) {
    localProgressStore.recordFinishedSession(mode, score);
    // Before the first sync completes (no marker yet) the session lives only
    // in local stats and is imported with them — queuing it too would
    // double count.
    if (activeUserId && hasMarker(activeUserId)) {
      writeOutbox([...readOutbox(), { mode, score, endedAt: Date.now() }]);
      schedulePush();
    }
  },
};

setProgressStore(syncedProgressStore);

/** Called by the auth watcher: a verified user turns sync on, null turns it off. */
export function setSyncUser(userId: string | null) {
  if (userId === activeUserId) return;
  activeUserId = userId;
  if (!userId) {
    if (pushTimer !== null) window.clearTimeout(pushTimer);
    pushTimer = null;
    setStatus('off');
    return;
  }
  if (!listening) {
    listening = true;
    window.addEventListener('online', () => void syncNow(true));
  }
  void syncNow(true);
}

/** Serializes syncs; a request during a run triggers exactly one follow-up. */
function syncNow(full: boolean): Promise<void> {
  if (running) {
    rerun = true;
    return running;
  }
  running = (async () => {
    try {
      do {
        rerun = false;
        await reconcile(full);
      } while (rerun);
    } finally {
      running = null;
    }
  })();
  return running;
}

async function flushOutbox(supabase: NonNullable<ReturnType<typeof getSupabase>>) {
  let items = readOutbox();
  while (items.length > 0) {
    const [item, ...rest] = items;
    const { error } = await supabase.rpc('record_session', {
      p_mode: item.mode,
      p_score: item.score,
      p_ended_at: new Date(item.endedAt).toISOString(),
    });
    if (error) throw error;
    items = rest;
    writeOutbox(items);
  }
}

async function pushProgress(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  dictionary: readonly DictionaryEntry[],
  bests: BestScores,
) {
  if (dictionary.length > 0) {
    const { error } = await supabase.rpc('upsert_dictionary', { p_entries: dictionary });
    if (error) throw error;
  }
  for (const mode of STATS_MODES) {
    if (bests[mode] <= 0) continue;
    const { error } = await supabase.rpc('upsert_best_score', { p_mode: mode, p_score: bests[mode] });
    if (error) throw error;
  }
}

async function reconcile(full: boolean) {
  const supabase = getSupabase();
  const userId = activeUserId;
  if (!supabase || !userId) return;
  if (!full && !isDirty()) return;

  setStatus('syncing');
  try {
    const before = JSON.stringify([
      localProgressStore.loadDictionary(),
      loadLocalBests(),
      localProgressStore.loadStats(),
    ]);

    // Guest → account: the first sync on this device uploads the guest's
    // counters/sessions once; afterwards new sessions travel via the outbox.
    if (!hasMarker(userId)) {
      const stats = localProgressStore.loadStats();
      const { error } = await supabase.rpc('import_guest_stats', {
        p_games: stats.gamesPlayed,
        p_sessions: stats.recentSessions,
      });
      if (error) throw error;
      setMarker(userId);
      writeOutbox([]);
    } else {
      await flushOutbox(supabase);
    }

    if (full) {
      const [dictRes, bestRes] = await Promise.all([
        supabase.from('dictionary_entries').select('word,count,bookmarked').order('learned_at'),
        supabase.from('best_scores').select('mode,score'),
      ]);
      if (dictRes.error) throw dictRes.error;
      if (bestRes.error) throw bestRes.error;

      const remoteBests = emptyBestScores();
      for (const row of bestRes.data ?? []) {
        if ((STATS_MODES as readonly string[]).includes(row.mode)) {
          remoteBests[row.mode as StatsMode] = row.score;
        }
      }
      const mergedDictionary = mergeDictionaries(
        localProgressStore.loadDictionary(),
        (dictRes.data ?? []) as DictionaryEntry[],
      );
      const mergedBests = mergeBestScores(loadLocalBests(), remoteBests);

      localProgressStore.saveDictionary(mergedDictionary);
      for (const mode of STATS_MODES) localProgressStore.saveBestScore(mode, mergedBests[mode]);
      await pushProgress(supabase, mergedDictionary, mergedBests);
    } else {
      await pushProgress(supabase, localProgressStore.loadDictionary(), loadLocalBests());
    }

    if (full) {
      const [gamesRes, sessionsRes] = await Promise.all([
        supabase.from('game_stats').select('mode,games_played'),
        supabase
          .from('session_records')
          .select('mode,score,ended_at')
          .order('ended_at', { ascending: false })
          .limit(20),
      ]);
      if (gamesRes.error) throw gamesRes.error;
      if (sessionsRes.error) throw sessionsRes.error;
      const stats: PlayerStats = statsFromServer(gamesRes.data ?? [], sessionsRes.data ?? []);
      window.localStorage.setItem(STATS_KEY, JSON.stringify(stats));
    }

    setDirty(false);
    setStatus('synced');

    const after = JSON.stringify([
      localProgressStore.loadDictionary(),
      loadLocalBests(),
      localProgressStore.loadStats(),
    ]);
    // Game components read storage once on mount, so pulled data needs a
    // reload to show up. Only fires when the pull actually changed something.
    if (full && after !== before) window.location.reload();
  } catch {
    setStatus('error');
  }
}

/**
 * Tries to push everything before logging out. Resolves true when nothing
 * unsynced would be lost.
 */
export async function prepareLogout(): Promise<boolean> {
  if (!activeUserId) return true;
  if (pushTimer !== null) window.clearTimeout(pushTimer);
  pushTimer = null;
  await syncNow(false);
  return status !== 'error' && !isDirty();
}

// Local progress is a cache of the account, so leaving it behind would hand
// this account's data to whoever logs in next on this device (a different
// account, or a guest whose progress would then be merged into it).
export async function finishLogout(): Promise<void> {
  await getSupabase()?.auth.signOut();
  setSyncUser(null);
  try {
    window.localStorage.removeItem(DICTIONARY_KEY);
    window.localStorage.removeItem(STATS_KEY);
    window.localStorage.removeItem(LEGACY_BEST_SCORE_KEY);
    for (const mode of STATS_MODES) window.localStorage.removeItem(bestScoreKey(mode));
    window.localStorage.removeItem(OUTBOX_KEY);
    window.localStorage.removeItem(DIRTY_KEY);
    window.localStorage.removeItem(MARKER_KEY);
    // In-progress boards are device-local but built from this account's
    // dictionary and score, so they'd otherwise carry over to the guest.
    window.localStorage.removeItem(LEGACY_SESSION_KEY);
    for (const mode of ['normal', 'hard']) window.localStorage.removeItem(sessionKey(mode));
  } catch {
    // nothing to clear
  }
  window.location.reload();
}

export type AccountActionResult = { ok: true } | { ok: false; error: string };

/** Reset for a signed-in user: wipes the server copy too, keeps the account. */
export async function resetAccountData(): Promise<AccountActionResult> {
  const supabase = getSupabase();
  const userId = activeUserId;
  if (!supabase || !userId) return { ok: false, error: 'Not signed in.' };
  if (pushTimer !== null) window.clearTimeout(pushTimer);
  pushTimer = null;
  // Wait out any in-flight sync so it can't re-upload after the wipe.
  await running;
  for (const table of ['dictionary_entries', 'best_scores', 'game_stats', 'session_records']) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    if (error) return { ok: false, error: error.message };
  }
  clearAllLocalData();
  window.location.reload();
  return { ok: true };
}

export async function deleteAccount(): Promise<AccountActionResult> {
  const supabase = getSupabase();
  if (!supabase || !activeUserId) return { ok: false, error: 'Not signed in.' };
  if (pushTimer !== null) window.clearTimeout(pushTimer);
  pushTimer = null;
  await running;
  const { error } = await supabase.rpc('delete_my_account');
  if (error) return { ok: false, error: error.message };
  await supabase.auth.signOut().catch(() => undefined);
  clearAllLocalData();
  window.location.reload();
  return { ok: true };
}
