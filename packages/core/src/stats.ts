// Local learning analytics for the Settings page (specs/settings-v2.md).
// Pure functions only — storage is a web-layer concern. Nothing here is
// ever sent anywhere.

import type { DictionaryEntry } from './dictionary';
import { VOCAB_LEVEL_1 } from './vocab';

export type StatsMode = 'normal' | 'hard' | 'concentration' | 'connectives';

export const STATS_MODES: readonly StatsMode[] = ['normal', 'hard', 'concentration', 'connectives'];

export const MAX_RECENT_SESSIONS = 20;

export interface SessionRecord {
  mode: StatsMode;
  score: number;
  endedAt: number;
}

export interface PlayerStats {
  gamesPlayed: Record<StatsMode, number>;
  /** Newest first, capped at MAX_RECENT_SESSIONS. */
  recentSessions: SessionRecord[];
}

export function emptyStats(): PlayerStats {
  return {
    gamesPlayed: { normal: 0, hard: 0, concentration: 0, connectives: 0 },
    recentSessions: [],
  };
}

export function recordSession(
  stats: PlayerStats,
  mode: StatsMode,
  score: number,
  endedAt: number,
): PlayerStats {
  return {
    gamesPlayed: { ...stats.gamesPlayed, [mode]: stats.gamesPlayed[mode] + 1 },
    recentSessions: [{ mode, score, endedAt }, ...stats.recentSessions].slice(
      0,
      MAX_RECENT_SESSIONS,
    ),
  };
}

/** Rebuilds stats from untrusted parsed JSON, defaulting anything malformed. */
export function normalizeStats(raw: unknown): PlayerStats {
  const stats = emptyStats();
  if (!raw || typeof raw !== 'object') return stats;
  const { gamesPlayed, recentSessions } = raw as {
    gamesPlayed?: Record<string, unknown>;
    recentSessions?: unknown;
  };
  for (const mode of STATS_MODES) {
    const value = gamesPlayed?.[mode];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      stats.gamesPlayed[mode] = Math.floor(value);
    }
  }
  if (Array.isArray(recentSessions)) {
    stats.recentSessions = recentSessions
      .filter(
        (s): s is SessionRecord =>
          !!s &&
          STATS_MODES.includes(s.mode) &&
          typeof s.score === 'number' &&
          Number.isFinite(s.score) &&
          typeof s.endedAt === 'number',
      )
      .slice(0, MAX_RECENT_SESSIONS);
  }
  return stats;
}

export function averageScore(sessions: readonly SessionRecord[]): number {
  if (sessions.length === 0) return 0;
  return Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length);
}

export interface DictionaryStats {
  wordsLearned: number;
  level1: number;
  level2: number;
  totalConjugations: number;
  /** Highest mastery count; ties go to the earliest-learned word. Null if empty. */
  mostDrilled: DictionaryEntry | null;
  starred: number;
}

const LEVEL_1_WORDS = new Set(VOCAB_LEVEL_1.map((entry) => entry.word));

export function dictionaryStats(dictionary: readonly DictionaryEntry[]): DictionaryStats {
  let level1 = 0;
  let totalConjugations = 0;
  let starred = 0;
  let mostDrilled: DictionaryEntry | null = null;
  for (const entry of dictionary) {
    if (LEVEL_1_WORDS.has(entry.word)) level1++;
    totalConjugations += entry.count;
    if (entry.bookmarked) starred++;
    if (!mostDrilled || entry.count > mostDrilled.count) mostDrilled = entry;
  }
  return {
    wordsLearned: dictionary.length,
    level1,
    level2: dictionary.length - level1,
    totalConjugations,
    mostDrilled,
    starred,
  };
}
