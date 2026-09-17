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

// --- v2 irregular classes (specs/vocab-v2.md) ------------------------------
//
// Shape alone can't identify these: a batchim-ㄷ stem like 듣다 is
// irregular, but v1's own 받다/닫다/믿다 (same shape) are not, and a
// batchim-ㅎ stem like 그렇다 is irregular while v1's own 좋다 is not. So,
// unlike the v1 groups above, these are a closed per-word lookup rather
// than something conjugate() can detect from the word's shape.

export type IrregularClass = 'd' | 'b' | 's' | 'leu' | 'h' | 'eu';

const IRREGULAR_CLASS_BY_WORD: Partial<Record<string, IrregularClass>> = {
  듣다: 'd', 걷다: 'd', 묻다: 'd', 싣다: 'd',
  춥다: 'b', 덥다: 'b', 쉽다: 'b', 어렵다: 'b', 가깝다: 'b',
  무겁다: 'b', 귀엽다: 'b', 눕다: 'b', 돕다: 'b',
  짓다: 's', 낫다: 's', 붓다: 's', 젓다: 's', 긋다: 's',
  모르다: 'leu', 부르다: 'leu', 빠르다: 'leu', 다르다: 'leu', 고르다: 'leu',
  그렇다: 'h', 빨갛다: 'h', 파랗다: 'h', 노랗다: 'h', 하얗다: 'h',
  쓰다: 'eu', 크다: 'eu', 아프다: 'eu', 바쁘다: 'eu', 기쁘다: 'eu', 고프다: 'eu',
};

/** True for any word conjugate() routes through an irregular class rather
 * than a v1 shape-based group — used by apps/web to gate Level 2 content
 * on Level 1 completion (specs/vocab-v2.md). */
export function isIrregular(word: string): boolean {
  return word in IRREGULAR_CLASS_BY_WORD;
}

// ㅂ-irregular's one lexicalized sub-exception (specs/vocab-v2.md): 돕다
// uses 오/와, not the usual 우/워 every other ㅂ-irregular in this list takes.
const B_IRREGULAR_OA_EXCEPTIONS = new Set(['돕다']);

/**
 * ㄷ-irregular (specs/vocab-v2.md): stem-final ㄷ -> ㄹ, then the normal
 * batchim-final 아/어 choice (v1 Group 1) applies to the new ㄹ-final stem.
 */
export function conjugateDIrregular(word: string, tense: Tense): string {
  const stem = stripDaSuffix(word);
  const lastChar = stem[stem.length - 1];
  const decomposed = decomposeSyllable(lastChar);
  if (!decomposed || decomposed.final !== 'ㄷ') {
    throw new Error(`conjugateDIrregular requires a ㄷ-batchim stem: ${word}`);
  }
  const swapped = composeSyllable(decomposed.initial, decomposed.medial, 'ㄹ');
  const swappedWord = stem.slice(0, -1) + swapped + '다';
  return conjugateBatchimFinal(swappedWord, tense);
}

/**
 * ㅂ-irregular (specs/vocab-v2.md): drop the ㅂ batchim, insert 우, and
 * contract with 어 -> 워 (아/았어요 never occurs here — 우 only pairs with
 * 어). 돕다 is the one lexicalized exception, contracting to 와 instead.
 */
export function conjugateBIrregular(word: string, tense: Tense): string {
  const stem = stripDaSuffix(word);
  const lastChar = stem[stem.length - 1];
  const decomposed = decomposeSyllable(lastChar);
  if (!decomposed || decomposed.final !== 'ㅂ') {
    throw new Error(`conjugateBIrregular requires a ㅂ-batchim stem: ${word}`);
  }
  const openSyllable = composeSyllable(decomposed.initial, decomposed.medial, '');
  const stemHead = stem.slice(0, -1) + openSyllable;
  const useOa = B_IRREGULAR_OA_EXCEPTIONS.has(word);
  if (tense === 'present') {
    return stemHead + (useOa ? '와요' : '워요');
  }
  return stemHead + (useOa ? '왔어요' : '웠어요');
}

/**
 * ㅅ-irregular (specs/vocab-v2.md): drop the ㅅ batchim entirely (no
 * substitution), then attach 아/어(요) as a *separate* syllable per normal
 * vowel harmony — unlike v1's diphthong group, the resulting open vowel
 * never contracts (짓다 -> 지어요, not 져요).
 */
export function conjugateSIrregular(word: string, tense: Tense): string {
  const stem = stripDaSuffix(word);
  const lastChar = stem[stem.length - 1];
  const decomposed = decomposeSyllable(lastChar);
  if (!decomposed || decomposed.final !== 'ㅅ') {
    throw new Error(`conjugateSIrregular requires a ㅅ-batchim stem: ${word}`);
  }
  const openSyllable = composeSyllable(decomposed.initial, decomposed.medial, '');
  const stemHead = stem.slice(0, -1) + openSyllable;
  const useA = YANG_VOWELS.has(decomposed.medial);
  const ending = tense === 'present' ? (useA ? '아요' : '어요') : useA ? '았어요' : '었어요';
  return stemHead + ending;
}

/**
 * 르-irregular (specs/vocab-v2.md): strip the 르 syllable, double its ㄹ
 * onto the *preceding* syllable's batchim, then attach 라/러(요) based on
 * that preceding syllable's own vowel — the one class that needs to look
 * further back than the stem's final syllable.
 */
export function conjugateLeuIrregular(word: string, tense: Tense): string {
  const stem = stripDaSuffix(word);
  if (stem.length < 2 || stem[stem.length - 1] !== '르') {
    throw new Error(`conjugateLeuIrregular requires a 르-final stem: ${word}`);
  }
  const precedingChar = stem[stem.length - 2];
  const decomposed = decomposeSyllable(precedingChar);
  if (!decomposed) {
    throw new Error(`Not a valid Hangul syllable: ${precedingChar}`);
  }
  const doubled = composeSyllable(decomposed.initial, decomposed.medial, 'ㄹ');
  const stemHead = stem.slice(0, -2) + doubled;
  const useA = YANG_VOWELS.has(decomposed.medial);
  if (tense === 'present') {
    return stemHead + (useA ? '라요' : '러요');
  }
  return stemHead + (useA ? '랐어요' : '렀어요');
}

// ㅎ-irregular (specs/vocab-v2.md): the merged vowel depends only on
// whether the dropped vowel was ㅏ/ㅓ (-> ㅐ) or ㅑ (-> ㅒ) — not on vowel
// harmony the way the other classes are, which is why this is a direct
// lookup rather than a YANG_VOWELS-style choice.
const H_IRREGULAR_VOWEL_MERGE: Partial<Record<JungJamo, JungJamo>> = {
  ㅏ: 'ㅐ',
  ㅓ: 'ㅐ',
  ㅑ: 'ㅒ',
};

/**
 * ㅎ-irregular, descriptive (specs/vocab-v2.md): drop the ㅎ batchim and
 * merge the final vowel to ㅐ/ㅒ in one fused syllable — never a separate
 * 아/어 syllable (그렇다 -> 그래요, not 그러애요). Only applies to this
 * closed list of descriptive words, never to a regular ㅎ-final stem like
 * v1's 좋다.
 */
export function conjugateHIrregularDescriptive(word: string, tense: Tense): string {
  const stem = stripDaSuffix(word);
  const lastChar = stem[stem.length - 1];
  const decomposed = decomposeSyllable(lastChar);
  if (!decomposed || decomposed.final !== 'ㅎ') {
    throw new Error(`conjugateHIrregularDescriptive requires a ㅎ-batchim stem: ${word}`);
  }
  const mergedMedial = H_IRREGULAR_VOWEL_MERGE[decomposed.medial];
  if (!mergedMedial) {
    throw new Error(
      `No ㅎ-irregular vowel merge for medial "${decomposed.medial}" in "${word}"`,
    );
  }
  const stemHead = stem.slice(0, -1);
  if (tense === 'present') {
    return stemHead + composeSyllable(decomposed.initial, mergedMedial, '') + '요';
  }
  return stemHead + composeSyllable(decomposed.initial, mergedMedial, 'ㅆ') + '어요';
}

/**
 * ㅡ-contraction (specs/vocab-v2.md): an open ㅡ-final stem drops its vowel
 * and fuses directly onto the remaining consonant. The 아/어 choice comes
 * from the *preceding* syllable's vowel, not the dropped ㅡ itself (which
 * carries no harmony value) — a single-syllable stem (쓰다, 크다) has no
 * preceding syllable to check, so it defaults to 어.
 */
export function conjugateEuContraction(word: string, tense: Tense): string {
  const stem = stripDaSuffix(word);
  const lastChar = stem[stem.length - 1];
  const decomposed = decomposeSyllable(lastChar);
  if (!decomposed || decomposed.medial !== 'ㅡ' || decomposed.final !== '') {
    throw new Error(`conjugateEuContraction requires an open ㅡ-final stem: ${word}`);
  }
  let useA = false;
  if (stem.length >= 2) {
    const precedingDecomposed = decomposeSyllable(stem[stem.length - 2]);
    useA = precedingDecomposed !== null && YANG_VOWELS.has(precedingDecomposed.medial);
  }
  const fusedMedial: JungJamo = useA ? 'ㅏ' : 'ㅓ';
  const stemHead = stem.slice(0, -1);
  if (tense === 'present') {
    return stemHead + composeSyllable(decomposed.initial, fusedMedial, '') + '요';
  }
  return stemHead + composeSyllable(decomposed.initial, fusedMedial, 'ㅆ') + '어요';
}

/**
 * Auto-detecting dispatcher: picks the right pattern-group function from
 * the word's own shape (하다-ending, batchim presence, then vowel class),
 * so callers (e.g. board.ts) don't need to track which group a word
 * belongs to separately from the word itself. Checks the v2 irregular
 * lookup first, since irregularity can't be detected from shape alone.
 */
export function conjugate(word: string, tense: Tense): string {
  const irregularClass = IRREGULAR_CLASS_BY_WORD[word];
  switch (irregularClass) {
    case 'd':
      return conjugateDIrregular(word, tense);
    case 'b':
      return conjugateBIrregular(word, tense);
    case 's':
      return conjugateSIrregular(word, tense);
    case 'leu':
      return conjugateLeuIrregular(word, tense);
    case 'h':
      return conjugateHIrregularDescriptive(word, tense);
    case 'eu':
      return conjugateEuContraction(word, tense);
  }
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
