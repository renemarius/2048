import { describe, expect, it } from 'vitest';
import { advancePool, createPool, pickReviewWord } from './pool';
import type { VocabEntry } from './vocab';
import { VOCAB } from './vocab';

function entry(word: string, meaning: string): VocabEntry {
  return { word, meaning, exampleSentence: `${word} example.`, exampleTranslation: 'example' };
}

const SMALL_VOCAB: VocabEntry[] = [entry('A다', 'a'), entry('B다', 'b'), entry('C다', 'c')];

describe('createPool', () => {
  it('picks the requested number of distinct words from vocab', () => {
    const pool = createPool(VOCAB, 4);
    expect(pool.active).toHaveLength(4);
    expect(new Set(pool.active).size).toBe(4);
    expect(pool.completed).toEqual([]);
    for (const word of pool.active) {
      expect(VOCAB.some((entry) => entry.word === word)).toBe(true);
    }
  });

  it('caps pool size at the vocab length instead of erroring', () => {
    const pool = createPool(SMALL_VOCAB, 10);
    expect(pool.active).toHaveLength(3);
  });
});

describe('advancePool', () => {
  it('retires a completed word and draws a replacement not already active or completed', () => {
    const pool = { active: ['A다', 'B다'], completed: [] };
    const { pool: next, added } = advancePool(pool, ['A다'], SMALL_VOCAB);

    expect(next.active).toContain('B다');
    expect(next.active).not.toContain('A다');
    expect(next.completed).toEqual(['A다']);
    expect(added).toEqual(['C다']);
    expect(next.active).toHaveLength(2);
  });

  it('ignores a word that is not in the active pool', () => {
    const pool = { active: ['A다'], completed: ['B다'] };
    const { pool: next, added } = advancePool(pool, ['C다다다-not-active'], SMALL_VOCAB);
    expect(next).toEqual(pool);
    expect(added).toEqual([]);
  });

  it('shrinks the pool instead of crashing once the whole vocab is used up', () => {
    const pool = { active: ['A다', 'B다'], completed: ['C다'] };
    const { pool: next, added } = advancePool(pool, ['A다'], SMALL_VOCAB);
    expect(next.active).toEqual(['B다']);
    expect(next.completed).toEqual(['C다', 'A다']);
    expect(added).toEqual([]);
  });

  it('handles multiple completed words in one call', () => {
    const pool = { active: ['A다', 'B다', 'C다'], completed: [] };
    const bigVocab: VocabEntry[] = [
      ...SMALL_VOCAB,
      entry('D다', 'd'),
      entry('E다', 'e'),
    ];
    const { pool: next, added } = advancePool(pool, ['A다', 'B다'], bigVocab);
    expect(next.active).toHaveLength(3);
    expect(next.completed).toEqual(['A다', 'B다']);
    expect(added).toHaveLength(2);
    expect(new Set(next.active).size).toBe(3);
  });
});

describe('pickReviewWord', () => {
  it('returns null when the roll fails (random >= reviewChance)', () => {
    const result = pickReviewWord(['A다', 'B다'], [], 0.4, () => 0.5);
    expect(result).toBeNull();
  });

  it('returns null when there are no learned words yet', () => {
    const result = pickReviewWord([], [], 0.4, () => 0);
    expect(result).toBeNull();
  });

  it('returns null when every learned word is already in the active pool', () => {
    const result = pickReviewWord(['A다', 'B다'], ['A다', 'B다'], 0.4, () => 0);
    expect(result).toBeNull();
  });

  it('picks a learned word not already in the active pool when the roll succeeds', () => {
    const result = pickReviewWord(['A다', 'B다', 'C다'], ['A다'], 0.4, () => 0);
    expect(result).not.toBeNull();
    expect(['B다', 'C다']).toContain(result);
    expect(result).not.toBe('A다');
  });

  it('uses the injected random consistently to select among candidates', () => {
    const learned = ['A다', 'B다', 'C다', 'D다'];
    // random() called twice: once for the reviewChance roll (must pass),
    // once to index into candidates — 0.99 * 4 candidates floors to
    // index 3 ('D다').
    const rolls = [0.1, 0.99];
    let call = 0;
    const result = pickReviewWord(learned, [], 0.5, () => rolls[call++]);
    expect(result).toBe('D다');
  });
});
