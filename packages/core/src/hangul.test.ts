import { describe, expect, it } from 'vitest';
import { composeSyllable, decomposeSyllable, hasBatchim } from './hangul';

describe('decomposeSyllable', () => {
  it('decomposes a batchim-final syllable', () => {
    expect(decomposeSyllable('먹')).toEqual({ initial: 'ㅁ', medial: 'ㅓ', final: 'ㄱ' });
  });

  it('decomposes an open (no batchim) syllable', () => {
    expect(decomposeSyllable('가')).toEqual({ initial: 'ㄱ', medial: 'ㅏ', final: '' });
  });

  it('returns null for non-Hangul-syllable input', () => {
    expect(decomposeSyllable('a')).toBeNull();
    expect(decomposeSyllable('ㄱ')).toBeNull();
  });
});

describe('composeSyllable', () => {
  it('round-trips with decomposeSyllable', () => {
    expect(composeSyllable('ㅁ', 'ㅓ', 'ㄱ')).toBe('먹');
    expect(composeSyllable('ㄱ', 'ㅏ', '')).toBe('가');
  });

  it('throws on an invalid jamo', () => {
    expect(() => composeSyllable('a' as never, 'ㅏ', '')).toThrow();
  });
});

describe('hasBatchim', () => {
  it('is true for a consonant-final syllable', () => {
    expect(hasBatchim('먹')).toBe(true);
    expect(hasBatchim('짧')).toBe(true);
  });

  it('is false for an open syllable', () => {
    expect(hasBatchim('가')).toBe(false);
  });
});
