import { describe, expect, it } from 'vitest';
import { conjugate } from './conjugate';
import { VOCAB } from './vocab';

describe('VOCAB', () => {
  it('has exactly the 62 words specified in specs/vocab-v1.md', () => {
    expect(VOCAB).toHaveLength(62);
  });

  it('has no duplicate words', () => {
    const words = VOCAB.map((entry) => entry.word);
    expect(new Set(words).size).toBe(words.length);
  });

  it('every word conjugates without throwing, in both tenses', () => {
    for (const { word } of VOCAB) {
      expect(() => conjugate(word, 'present')).not.toThrow();
      expect(() => conjugate(word, 'past')).not.toThrow();
    }
  });
});
