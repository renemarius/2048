// Pure merge rules for guest → account migration and multi-device sync
// (specs/accounts-v2.5.md). No storage or network here — the web layer
// fetches/persists and calls these.

import type { DictionaryEntry } from './dictionary';
import { MAX_RECENT_SESSIONS, STATS_MODES, normalizeStats } from './stats';
import type { PlayerStats, StatsMode } from './stats';

export type BestScores = Record<StatsMode, number>;

export function emptyBestScores(): BestScores {
  return { normal: 0, hard: 0, concentration: 0, connectives: 0 };
}

/**
 * Union of words. `count` takes the max (not the sum — merging is repeated
 * on every login and must be idempotent), `bookmarked` is OR. Local order
 * is kept; words only the remote has are appended in remote order.
 */
export function mergeDictionaries(
  local: readonly DictionaryEntry[],
  remote: readonly DictionaryEntry[],
): DictionaryEntry[] {
  const merged = new Map<string, DictionaryEntry>();
  for (const entry of local) merged.set(entry.word, { ...entry });
  for (const entry of remote) {
    const existing = merged.get(entry.word);
    if (existing) {
      merged.set(entry.word, {
        word: entry.word,
        count: Math.max(existing.count, entry.count),
        bookmarked: existing.bookmarked || entry.bookmarked,
      });
    } else {
      merged.set(entry.word, { ...entry });
    }
  }
  return [...merged.values()];
}

export function mergeBestScores(a: BestScores, b: BestScores): BestScores {
  const out = emptyBestScores();
  for (const mode of STATS_MODES) out[mode] = Math.max(a[mode], b[mode]);
  return out;
}

export interface ServerGameStatsRow {
  mode: string;
  games_played: number;
}

export interface ServerSessionRow {
  mode: string;
  score: number;
  ended_at: string;
}

/** Rebuilds PlayerStats from database rows; malformed rows are dropped. */
export function statsFromServer(
  games: readonly ServerGameStatsRow[],
  sessions: readonly ServerSessionRow[],
): PlayerStats {
  const gamesPlayed: Record<string, number> = {};
  for (const row of games) gamesPlayed[row.mode] = row.games_played;
  const recentSessions = sessions
    .map((row) => ({ mode: row.mode, score: row.score, endedAt: Date.parse(row.ended_at) }))
    .filter((row) => Number.isFinite(row.endedAt))
    .sort((a, b) => b.endedAt - a.endedAt)
    .slice(0, MAX_RECENT_SESSIONS);
  return normalizeStats({ gamesPlayed, recentSessions });
}
