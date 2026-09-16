import { composeSyllable, decomposeSyllable, type JungJamo } from './hangul';

export type Tense = 'present' | 'past';

// Stems whose last vowel is ㅏ or ㅗ take the -아요/-았어요 endings;
// every other stem takes -어요/-었어요. See specs/vocab-v1.md, Group 1.
const YANG_VOWELS = new Set(['ㅏ', 'ㅗ']);

// Group 2 (specs/vocab-v1.md): open stems ending in one of these vowels
// don't change at all when 아/어 is attached — the added vowel is fully
// absorbed, so present tense is just "stem + 요".
const ELISION_VOWELS = new Set(['ㅏ', 'ㅓ', 'ㅐ', 'ㅔ', 'ㅕ']);

// Group 3 (specs/vocab-v1.md): open stems ending in one of these vowels
// merge with the added 아/어 into a diphthong (ㅗ+아→ㅘ, ㅜ+어→ㅝ, ㅣ+어→ㅕ)
// rather than disappearing outright.
const DIPHTHONG_VOWELS: Partial<Record<JungJamo, JungJamo>> = {
  ㅗ: 'ㅘ',
  ㅜ: 'ㅝ',
  ㅣ: 'ㅕ',
};

function stripDaSuffix(word: string): string {
  if (!word.endsWith('다')) {
    throw new Error(`Expected a dictionary-form word ending in 다: ${word}`);
  }
  return word.slice(0, -1);
}

function decomposeLastSyllable(stem: string, word: string) {
  const lastChar = stem[stem.length - 1];
  const decomposed = decomposeSyllable(lastChar);
  if (!decomposed) {
    throw new Error(`Not a valid Hangul syllable: ${lastChar}`);
  }
  if (decomposed.final !== '') {
    throw new Error(
      `Expected an open (batchim-less) final stem syllable, but "${word}" ends in a closed syllable — use conjugateBatchimFinal instead`,
    );
  }
  return decomposed;
}

/**
 * Pattern Group 1 (specs/vocab-v1.md): batchim-final stems. No contraction
 * is possible — the trailing consonant blocks any vowel collision — so
 * this is pure 아/어 selection.
 */
export function conjugateBatchimFinal(word: string, tense: Tense): string {
  const stem = stripDaSuffix(word);
  const lastChar = stem[stem.length - 1];
  const decomposed = decomposeSyllable(lastChar);
  if (!decomposed) {
    throw new Error(`Not a valid Hangul syllable: ${lastChar}`);
  }
  if (decomposed.final === '') {
    throw new Error(
      `conjugateBatchimFinal requires a batchim-final stem, but "${word}" ends in an open syllable — use conjugateOpenElision/conjugateOpenDiphthong instead`,
    );
  }
  const useA = YANG_VOWELS.has(decomposed.medial);
  const ending =
    tense === 'present' ? (useA ? '아요' : '어요') : useA ? '았어요' : '었어요';
  return stem + ending;
}

/**
 * Pattern Group 4 (specs/vocab-v1.md): 하다-verbs. Fixed substitution,
 * exceptionless for every noun/adverb + 하다 compound.
 */
export function conjugateHada(word: string, tense: Tense): string {
  if (!word.endsWith('하다')) {
    throw new Error(`Expected a 하다-verb: ${word}`);
  }
  const stem = word.slice(0, -2);
  const ending = tense === 'present' ? '해요' : '했어요';
  return stem + ending;
}

/**
 * Pattern Group 2 (specs/vocab-v1.md): open-vowel stems ending in
 * ㅏ/ㅓ/ㅐ/ㅔ/ㅕ. The added 아/어 vowel is fully absorbed into the stem's
 * own final vowel rather than forming a new syllable (가다 -> 가요, not
 * 가아요) — so the stem's last syllable is unchanged in present tense, and
 * only gains a ㅆ batchim (then "어요") in past tense.
 */
export function conjugateOpenElision(word: string, tense: Tense): string {
  const stem = stripDaSuffix(word);
  const decomposed = decomposeLastSyllable(stem, word);
  if (!ELISION_VOWELS.has(decomposed.medial)) {
    throw new Error(
      `conjugateOpenElision doesn't cover vowel "${decomposed.medial}" in "${word}" — use conjugateOpenDiphthong instead`,
    );
  }
  if (tense === 'present') {
    return stem + '요';
  }
  const stemHead = stem.slice(0, -1);
  const pastSyllable = composeSyllable(decomposed.initial, decomposed.medial, 'ㅆ');
  return stemHead + pastSyllable + '어요';
}

/**
 * Pattern Group 3 (specs/vocab-v1.md): open-vowel stems ending in
 * ㅗ/ㅜ/ㅣ, where the added 아/어 vowel forms a diphthong with the stem's
 * final vowel (오다 -> 와요, not 오아요; 배우다 -> 배워요, not 배우어요).
 */
export function conjugateOpenDiphthong(word: string, tense: Tense): string {
  const stem = stripDaSuffix(word);
  const decomposed = decomposeLastSyllable(stem, word);
  const diphthongMedial = DIPHTHONG_VOWELS[decomposed.medial];
  if (!diphthongMedial) {
    throw new Error(
      `conjugateOpenDiphthong doesn't cover vowel "${decomposed.medial}" in "${word}" — use conjugateOpenElision instead`,
    );
  }
  const stemHead = stem.slice(0, -1);
  if (tense === 'present') {
    const mergedSyllable = composeSyllable(decomposed.initial, diphthongMedial, '');
    return stemHead + mergedSyllable + '요';
  }
  const pastSyllable = composeSyllable(decomposed.initial, diphthongMedial, 'ㅆ');
  return stemHead + pastSyllable + '어요';
}

/**
 * Auto-detecting dispatcher: picks the right pattern-group function from
 * the word's own shape (하다-ending, batchim presence, then vowel class),
 * so callers (e.g. board.ts) don't need to track which group a word
 * belongs to separately from the word itself.
 */
export function conjugate(word: string, tense: Tense): string {
  if (word.endsWith('하다')) {
    return conjugateHada(word, tense);
  }
  const stem = stripDaSuffix(word);
  const lastChar = stem[stem.length - 1];
  const decomposed = decomposeSyllable(lastChar);
  if (!decomposed) {
    throw new Error(`Not a valid Hangul syllable: ${lastChar}`);
  }
  if (decomposed.final !== '') {
    return conjugateBatchimFinal(word, tense);
  }
  if (ELISION_VOWELS.has(decomposed.medial)) {
    return conjugateOpenElision(word, tense);
  }
  if (decomposed.medial in DIPHTHONG_VOWELS) {
    return conjugateOpenDiphthong(word, tense);
  }
  throw new Error(
    `No v1 conjugation rule covers "${word}" (final vowel "${decomposed.medial}") — see specs/vocab-v1.md`,
  );
}
