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

  it('every entry has a non-empty example sentence and translation', () => {
    for (const entry of VOCAB) {
      expect(entry.exampleSentence.length).toBeGreaterThan(0);
      expect(entry.exampleTranslation.length).toBeGreaterThan(0);
    }
  });

  it("every example sentence actually contains the word's real present-tense form", () => {
    // Guards against hand-written example sentences drifting from what
    // conjugate() actually produces (e.g. a typo'd surface form) — the
    // whole point of the sentence is to reinforce the exact conjugation
    // the game just taught.
    for (const entry of VOCAB) {
      const presentForm = conjugate(entry.word, 'present');
      expect(entry.exampleSentence).toContain(presentForm);
    }
  });
});
