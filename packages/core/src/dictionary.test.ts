import { describe, expect, it } from 'vitest';
import { NEW_WORD_BONUS, updateDictionary } from './dictionary';

describe('updateDictionary', () => {
  it('adds a new word with count 1 and awards the bonus', () => {
    const result = updateDictionary([], ['가다']);
    expect(result.dictionary).toEqual([{ word: '가다', count: 1 }]);
    expect(result.newWords).toEqual(['가다']);
    expect(result.bonus).toBe(NEW_WORD_BONUS);
  });

  it('awards no bonus but increments the count for a word already in the dictionary', () => {
    const result = updateDictionary([{ word: '가다', count: 1 }], ['가다']);
    expect(result.dictionary).toEqual([{ word: '가다', count: 2 }]);
    expect(result.newWords).toEqual([]);
    expect(result.bonus).toBe(0);
  });

  it('handles a mix of new and already-known words from one move', () => {
    const result = updateDictionary([{ word: '가다', count: 3 }], ['가다', '먹다', '오다']);
    expect(result.dictionary).toEqual([
      { word: '가다', count: 4 },
      { word: '먹다', count: 1 },
      { word: '오다', count: 1 },
    ]);
    expect(result.newWords).toEqual(['먹다', '오다']);
    expect(result.bonus).toBe(NEW_WORD_BONUS * 2);
  });

  it('counts a word twice when it completes twice in one move, but only awards the bonus once', () => {
    const result = updateDictionary([], ['먹다', '먹다']);
    expect(result.dictionary).toEqual([{ word: '먹다', count: 2 }]);
    expect(result.newWords).toEqual(['먹다']);
    expect(result.bonus).toBe(NEW_WORD_BONUS);
  });

  it('returns an empty update for no completed words', () => {
    const result = updateDictionary([{ word: '가다', count: 1 }], []);
    expect(result.dictionary).toEqual([{ word: '가다', count: 1 }]);
    expect(result.newWords).toEqual([]);
    expect(result.bonus).toBe(0);
  });

  it('preserves learned order across repeated calls', () => {
    const first = updateDictionary([], ['가다']);
    const second = updateDictionary(first.dictionary, ['먹다']);
    expect(second.dictionary.map((entry) => entry.word)).toEqual(['가다', '먹다']);
  });
});
