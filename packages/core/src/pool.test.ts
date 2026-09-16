import { describe, expect, it } from 'vitest';
import { advancePool, createPool } from './pool';
import type { VocabEntry } from './vocab';
import { VOCAB } from './vocab';

const SMALL_VOCAB: VocabEntry[] = [
  { word: 'A다', meaning: 'a' },
  { word: 'B다', meaning: 'b' },
  { word: 'C다', meaning: 'c' },
];

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
      { word: 'D다', meaning: 'd' },
      { word: 'E다', meaning: 'e' },
    ];
    const { pool: next, added } = advancePool(pool, ['A다', 'B다'], bigVocab);
    expect(next.active).toHaveLength(3);
    expect(next.completed).toEqual(['A다', 'B다']);
    expect(added).toHaveLength(2);
    expect(new Set(next.active).size).toBe(3);
  });
});
