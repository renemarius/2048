import { describe, expect, it } from 'vitest';
import {
  MAX_RECENT_SESSIONS,
  averageScore,
  dictionaryStats,
  emptyStats,
  normalizeStats,
  recordSession,
} from './stats';

describe('recordSession', () => {
  it('increments only the given mode and prepends the record', () => {
    const a = recordSession(emptyStats(), 'hard', 120, 1);
    const b = recordSession(a, 'normal', 40, 2);
    expect(b.gamesPlayed).toEqual({ normal: 1, hard: 1, concentration: 0, connectives: 0 });
    expect(b.recentSessions.map((s) => s.score)).toEqual([40, 120]);
  });

  it('does not mutate its input', () => {
    const before = emptyStats();
    recordSession(before, 'normal', 10, 1);
    expect(before).toEqual(emptyStats());
  });

  it('caps history but keeps counting games', () => {
    let stats = emptyStats();
    for (let i = 0; i < MAX_RECENT_SESSIONS + 5; i++) stats = recordSession(stats, 'normal', i, i);
    expect(stats.recentSessions).toHaveLength(MAX_RECENT_SESSIONS);
    expect(stats.recentSessions[0].score).toBe(MAX_RECENT_SESSIONS + 4);
    expect(stats.gamesPlayed.normal).toBe(MAX_RECENT_SESSIONS + 5);
  });
});

describe('normalizeStats', () => {
  it('returns empty stats for junk', () => {
    expect(normalizeStats(null)).toEqual(emptyStats());
    expect(normalizeStats('x')).toEqual(emptyStats());
    expect(normalizeStats({ gamesPlayed: { normal: -3, hard: 'a' }, recentSessions: 5 })).toEqual(
      emptyStats(),
    );
  });

  it('round-trips valid stats and drops malformed sessions', () => {
    const good = recordSession(emptyStats(), 'concentration', 80, 5);
    expect(normalizeStats(JSON.parse(JSON.stringify(good)))).toEqual(good);
    const mixed = normalizeStats({
      ...good,
      recentSessions: [...good.recentSessions, { mode: 'bogus', score: 1, endedAt: 1 }, null],
    });
    expect(mixed.recentSessions).toEqual(good.recentSessions);
  });
});

describe('averageScore', () => {
  it('is 0 when empty and rounded otherwise', () => {
    expect(averageScore([])).toBe(0);
    expect(
      averageScore([
        { mode: 'normal', score: 10, endedAt: 1 },
        { mode: 'normal', score: 15, endedAt: 2 },
      ]),
    ).toBe(13);
  });
});

describe('dictionaryStats', () => {
  it('handles an empty dictionary', () => {
    expect(dictionaryStats([])).toEqual({
      wordsLearned: 0,
      level1: 0,
      level2: 0,
      totalConjugations: 0,
      mostDrilled: null,
      starred: 0,
    });
  });

  it('splits levels, sums counts, and picks the most drilled (earliest on ties)', () => {
    const stats = dictionaryStats([
      { word: '가다', count: 3, bookmarked: true },
      { word: '돕다', count: 3, bookmarked: false },
      { word: '먹다', count: 1, bookmarked: true },
    ]);
    expect(stats.wordsLearned).toBe(3);
    expect(stats.level1).toBe(2);
    expect(stats.level2).toBe(1);
    expect(stats.totalConjugations).toBe(7);
    expect(stats.mostDrilled?.word).toBe('가다');
    expect(stats.starred).toBe(2);
  });
});
