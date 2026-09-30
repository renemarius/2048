// Storage seam for player progress (specs/accounts-v2.5.md build step 1).
// Game components talk to this interface instead of localStorage, so the
// Supabase-backed store can be dropped in later without touching them.
//
// Only *syncable* data goes through here: dictionary, best scores, stats.
// Device-local state (in-progress boards, chosen mode, theme, rules-seen)
// deliberately stays on direct localStorage — it never syncs.

import type { DictionaryEntry, PlayerStats, StatsMode } from 'core';
import { emptyStats, normalizeStats, recordSession } from 'core';
import { bestScoreKey, LEGACY_BEST_SCORE_KEY } from './storage-keys';

export interface ProgressStore {
  loadDictionary(): DictionaryEntry[];
  saveDictionary(entries: readonly DictionaryEntry[]): void;
  loadBestScore(mode: StatsMode): number;
  saveBestScore(mode: StatsMode, value: number): void;
  loadStats(): PlayerStats;
  recordFinishedSession(mode: StatsMode, score: number): void;
}

export const DICTIONARY_KEY = '2048-hangul:dictionary';
export const STATS_KEY = '2048-hangul:stats';

export const localProgressStore: ProgressStore = {
  loadDictionary() {
    try {
      const raw = window.localStorage.getItem(DICTIONARY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Back-compat: sessions saved before mastery counts existed stored
      // plain `string[]` — treat each as having been completed once.
      if (parsed.every((entry) => typeof entry === 'string')) {
        return parsed.map((word) => ({ word, count: 1, bookmarked: false }));
      }
      if (
        parsed.every(
          (entry) => entry && typeof entry.word === 'string' && typeof entry.count === 'number',
        )
      ) {
        // Back-compat: sessions saved before bookmarks existed are missing
        // the field entirely — default to unstarred.
        return (parsed as Array<Partial<DictionaryEntry> & { word: string; count: number }>).map(
          (entry) => ({
            word: entry.word,
            count: entry.count,
            bookmarked: entry.bookmarked ?? false,
          }),
        );
      }
      return [];
    } catch {
      return [];
    }
  },

  saveDictionary(entries) {
    try {
      window.localStorage.setItem(DICTIONARY_KEY, JSON.stringify(entries));
    } catch {
      // localStorage unavailable (private browsing, quota, etc.) — the game
      // still works, it just won't survive a reload.
    }
  },

  loadBestScore(mode) {
    try {
      // Normal falls back to the pre-v2 unsuffixed key (see storage-keys.ts).
      const raw =
        window.localStorage.getItem(bestScoreKey(mode)) ??
        (mode === 'normal' ? window.localStorage.getItem(LEGACY_BEST_SCORE_KEY) : null);
      const parsed = raw ? Number(raw) : 0;
      return Number.isFinite(parsed) ? parsed : 0;
    } catch {
      return 0;
    }
  },

  saveBestScore(mode, value) {
    try {
      window.localStorage.setItem(bestScoreKey(mode), String(value));
    } catch {
      // see saveDictionary
    }
  },

  loadStats() {
    try {
      const raw = window.localStorage.getItem(STATS_KEY);
      return raw ? normalizeStats(JSON.parse(raw)) : emptyStats();
    } catch {
      return emptyStats();
    }
  },

  recordFinishedSession(mode, score) {
    try {
      const next = recordSession(this.loadStats(), mode, score, Date.now());
      window.localStorage.setItem(STATS_KEY, JSON.stringify(next));
    } catch {
      // analytics are best-effort
    }
  },
};

let activeStore: ProgressStore = localProgressStore;

export function getProgressStore(): ProgressStore {
  return activeStore;
}

export function setProgressStore(store: ProgressStore): void {
  activeStore = store;
}

// Thin wrappers so call sites read like plain functions.
export const loadDictionary = () => activeStore.loadDictionary();
export const persistDictionary = (entries: readonly DictionaryEntry[]) =>
  activeStore.saveDictionary(entries);
export const loadBestScore = (mode: StatsMode) => activeStore.loadBestScore(mode);
export const persistBestScore = (mode: StatsMode, value: number) =>
  activeStore.saveBestScore(mode, value);
export const loadStats = () => activeStore.loadStats();
export const recordFinishedSession = (mode: StatsMode, score: number) =>
  activeStore.recordFinishedSession(mode, score);
