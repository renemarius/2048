// Standard Hangul syllable decomposition, per the Unicode algorithm:
// every precomposed syllable in the AC00–D7A3 block encodes
// initial/medial/final jamo as (initial * 21 + medial) * 28 + final,
// offset from 0xAC00.

const SYLLABLE_BASE = 0xac00;
const SYLLABLE_END = 0xd7a3;

const CHO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

const JUNG = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
] as const;

// index 0 = no final consonant (open syllable)
const JONG = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
] as const;

export type ChoJamo = (typeof CHO)[number];
export type JungJamo = (typeof JUNG)[number];
export type JongJamo = (typeof JONG)[number];

export interface DecomposedSyllable {
  initial: ChoJamo;
  medial: JungJamo;
  final: JongJamo;
}

export function decomposeSyllable(char: string): DecomposedSyllable | null {
  const code = char.codePointAt(0);
  if (code === undefined || code < SYLLABLE_BASE || code > SYLLABLE_END) {
    return null;
  }
  const offset = code - SYLLABLE_BASE;
  const finalIndex = offset % JONG.length;
  const jungIndex = Math.floor(offset / JONG.length) % JUNG.length;
  const choIndex = Math.floor(offset / JONG.length / JUNG.length);
  return {
    initial: CHO[choIndex],
    medial: JUNG[jungIndex],
    final: JONG[finalIndex],
  };
}

export function composeSyllable(
  initial: ChoJamo,
  medial: JungJamo,
  final: JongJamo = '',
): string {
  const choIndex = CHO.indexOf(initial);
  const jungIndex = JUNG.indexOf(medial);
  const jongIndex = JONG.indexOf(final);
  if (choIndex === -1 || jungIndex === -1 || jongIndex === -1) {
    throw new Error(
      `Invalid jamo combination: initial=${initial} medial=${medial} final=${final}`,
    );
  }
  const code = SYLLABLE_BASE + (choIndex * JUNG.length + jungIndex) * JONG.length + jongIndex;
  return String.fromCodePoint(code);
}

export function hasBatchim(char: string): boolean {
  const decomposed = decomposeSyllable(char);
  if (!decomposed) {
    throw new Error(`Not a precomposed Hangul syllable: ${char}`);
  }
  return decomposed.final !== '';
}
