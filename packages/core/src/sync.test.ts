import { describe, expect, it } from 'vitest';
import type { DictionaryEntry } from './dictionary';
import { emptyBestScores, mergeBestScores, mergeDictionaries, statsFromServer } from './sync';

const e = (word: string, count: number, bookmarked = false): DictionaryEntry => ({
  word,
  count,
  bookmarked,
});

describe('mergeDictionaries', () => {
  it('unions words, keeping local order then appending remote-only words', () => {
    const merged = mergeDictionaries([e('가다', 1), e('먹다', 2)], [e('보다', 1), e('가다', 1)]);
    expect(merged.map((x) => x.word)).toEqual(['가다', '먹다', '보다']);
  });

  it('takes the max count and ORs bookmarks', () => {
    const merged = mergeDictionaries([e('가다', 5, false)], [e('가다', 3, true)]);
    expect(merged).toEqual([e('가다', 5, true)]);
  });

  it('is idempotent — merging the result with either side changes nothing', () => {
    const a = [e('가다', 2, true), e('먹다', 1)];
    const b = [e('먹다', 4), e('보다', 1)];
    const once = mergeDictionaries(a, b);
    expect(mergeDictionaries(once, b)).toEqual(once);
    expect(mergeDictionaries(once, a)).toEqual(once);
  });

  it('handles empty sides and does not mutate inputs', () => {
    const a = [e('가다', 1)];
    expect(mergeDictionaries([], a)).toEqual(a);
    expect(mergeDictionaries(a, [])).toEqual(a);
    const merged = mergeDictionaries(a, [e('가다', 9)]);
    expect(a[0].count).toBe(1);
    expect(merged[0]).not.toBe(a[0]);
  });
});

describe('mergeBestScores', () => {
  it('takes the max per mode', () => {
    const a = { ...emptyBestScores(), normal: 100, hard: 5 };
    const b = { ...emptyBestScores(), normal: 40, hard: 60, connectives: 30 };
    expect(mergeBestScores(a, b)).toEqual({
      normal: 100,
      hard: 60,
      concentration: 0,
      connectives: 30,
    });
  });
});

describe('statsFromServer', () => {
  it('maps rows, sorts sessions newest first, and caps at 20', () => {
    const sessions = Array.from({ length: 25 }, (_, i) => ({
      mode: 'normal',
      score: i,
      ended_at: new Date(1_700_000_000_000 + i * 1000).toISOString(),
    }));
    const stats = statsFromServer([{ mode: 'normal', games_played: 25 }], sessions);
    expect(stats.gamesPlayed.normal).toBe(25);
    expect(stats.gamesPlayed.hard).toBe(0);
    expect(stats.recentSessions).toHaveLength(20);
    expect(stats.recentSessions[0].score).toBe(24);
    expect(stats.recentSessions[0].endedAt).toBe(1_700_000_000_000 + 24 * 1000);
  });

  it('drops unknown modes and unparseable timestamps', () => {
    const stats = statsFromServer(
      [{ mode: 'bogus', games_played: 3 }],
      [
        { mode: 'normal', score: 1, ended_at: 'not a date' },
        { mode: 'bogus', score: 1, ended_at: new Date(0).toISOString() },
      ],
    );
    expect(stats.gamesPlayed).toEqual({ normal: 0, hard: 0, concentration: 0, connectives: 0 });
    expect(stats.recentSessions).toEqual([]);
  });
});
