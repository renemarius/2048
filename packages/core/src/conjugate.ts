import { decomposeSyllable } from './hangul';

export type Tense = 'present' | 'past';

// Stems whose last vowel is ㅏ or ㅗ take the -아요/-았어요 endings;
// every other stem takes -어요/-었어요. See specs/vocab-v1.md, Group 1.
const YANG_VOWELS = new Set(['ㅏ', 'ㅗ']);

function stripDaSuffix(word: string): string {
  if (!word.endsWith('다')) {
    throw new Error(`Expected a dictionary-form word ending in 다: ${word}`);
  }
  return word.slice(0, -1);
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
 * ㅏ/ㅓ/ㅐ/ㅔ/ㅕ, where the added 아/어 vowel elides into the stem's own
 * final vowel (가다 -> 가요, not 가아요). Not yet implemented — do not add
 * a Group 2 word to the live vocab list until this lands.
 */
export function conjugateOpenElision(_word: string, _tense: Tense): string {
  throw new Error('conjugateOpenElision is not implemented yet — see specs/vocab-v1.md Group 2');
}

/**
 * Pattern Group 3 (specs/vocab-v1.md): open-vowel stems ending in
 * ㅗ/ㅜ/ㅣ, where the added 아/어 vowel forms a diphthong with the stem's
 * final vowel (오다 -> 와요, not 오아요). Not yet implemented — do not add
 * a Group 3 word to the live vocab list until this lands.
 */
export function conjugateOpenDiphthong(_word: string, _tense: Tense): string {
  throw new Error('conjugateOpenDiphthong is not implemented yet — see specs/vocab-v1.md Group 3');
}
