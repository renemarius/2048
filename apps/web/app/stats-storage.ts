// localStorage glue for the local-only analytics in specs/settings-v2.md.
// The math itself lives in packages/core/src/stats.ts.

import { emptyStats, normalizeStats, recordSession, type PlayerStats, type StatsMode } from 'core';

export const STATS_KEY = '2048-hangul:stats';
export const PROFILE_NAME_KEY = '2048-hangul:profileName';

export function loadStats(): PlayerStats {
  try {
    const raw = window.localStorage.getItem(STATS_KEY);
    return raw ? normalizeStats(JSON.parse(raw)) : emptyStats();
  } catch {
    return emptyStats();
  }
}

export function recordFinishedSession(mode: StatsMode, score: number): void {
  try {
    const next = recordSession(loadStats(), mode, score, Date.now());
    window.localStorage.setItem(STATS_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable — analytics are best-effort.
  }
}

export function loadProfileName(): string {
  try {
    return window.localStorage.getItem(PROFILE_NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function persistProfileName(name: string): void {
  try {
    window.localStorage.setItem(PROFILE_NAME_KEY, name);
  } catch {
    // see recordFinishedSession
  }
}

// Reset wipes everything the app has stored (specs/settings-v2.md), which
// is every key under our prefix plus the un-prefixed theme key.
export function clearAllLocalData(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && (key.startsWith('2048-hangul:') || key === 'theme')) keys.push(key);
    }
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // nothing to clear if storage is unavailable
  }
}
