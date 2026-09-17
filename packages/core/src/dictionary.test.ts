import { describe, expect, it } from 'vitest';
import { NEW_WORD_BONUS, updateDictionary } from './dictionary';

describe('updateDictionary', () => {
  it('adds a new word and awards the bonus', () => {
    const result = updateDictionary([], ['가다']);
    expect(result.dictionary).toEqual(['가다']);
    expect(result.newWords).toEqual(['가다']);
    expect(result.bonus).toBe(NEW_WORD_BONUS);
  });

  it('awards no bonus for a word already in the dictionary', () => {
    const result = updateDictionary(['가다'], ['가다']);
    expect(result.dictionary).toEqual(['가다']);
    expect(result.newWords).toEqual([]);
    expect(result.bonus).toBe(0);
  });

  it('handles a mix of new and already-known words from one move', () => {
    const result = updateDictionary(['가다'], ['가다', '먹다', '오다']);
    expect(result.dictionary).toEqual(['가다', '먹다', '오다']);
    expect(result.newWords).toEqual(['먹다', '오다']);
    expect(result.bonus).toBe(NEW_WORD_BONUS * 2);
  });

  it('deduplicates when the same new word completes twice in one move', () => {
    const result = updateDictionary([], ['먹다', '먹다']);
    expect(result.dictionary).toEqual(['먹다']);
    expect(result.newWords).toEqual(['먹다']);
    expect(result.bonus).toBe(NEW_WORD_BONUS);
  });

  it('returns an empty update for no completed words', () => {
    const result = updateDictionary(['가다'], []);
    expect(result.dictionary).toEqual(['가다']);
    expect(result.newWords).toEqual([]);
    expect(result.bonus).toBe(0);
  });

  it('preserves learned order across repeated calls', () => {
    const first = updateDictionary([], ['가다']);
    const second = updateDictionary(first.dictionary, ['먹다']);
    expect(second.dictionary).toEqual(['가다', '먹다']);
  });
});
