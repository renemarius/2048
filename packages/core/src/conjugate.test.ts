import { describe, expect, it } from 'vitest';
import {
  conjugate,
  conjugateBatchimFinal,
  conjugateBIrregular,
  conjugateDIrregular,
  conjugateEuContraction,
  conjugateHada,
  conjugateHIrregularDescriptive,
  conjugateLeuIrregular,
  conjugateOpenDiphthong,
  conjugateOpenElision,
  conjugateSIrregular,
} from './conjugate';

// Every Group 1 / Group 4 word from specs/vocab-v1.md, present + past,
// exercised exhaustively — this is the correctness-critical part of the
// project (constitution.md Principle 1), so every listed word gets a
// real assertion rather than a spot check.

const group1Words: Array<[word: string, present: string, past: string]> = [
  ['먹다', '먹어요', '먹었어요'],
  ['읽다', '읽어요', '읽었어요'],
  ['받다', '받아요', '받았어요'],
  ['앉다', '앉아요', '앉았어요'],
  ['웃다', '웃어요', '웃었어요'],
  ['씻다', '씻어요', '씻었어요'],
  ['신다', '신어요', '신었어요'],
  ['입다', '입어요', '입었어요'],
  ['놀다', '놀아요', '놀았어요'],
  ['살다', '살아요', '살았어요'],
  ['알다', '알아요', '알았어요'],
  ['열다', '열어요', '열었어요'],
  ['닫다', '닫아요', '닫았어요'],
  ['믿다', '믿어요', '믿었어요'],
  ['좋다', '좋아요', '좋았어요'],
  ['많다', '많아요', '많았어요'],
  ['작다', '작아요', '작았어요'],
  ['높다', '높아요', '높았어요'],
  ['짧다', '짧아요', '짧았어요'],
  ['길다', '길어요', '길었어요'],
  ['찾다', '찾아요', '찾았어요'],
  ['잡다', '잡아요', '잡았어요'],
  ['있다', '있어요', '있었어요'],
  ['없다', '없어요', '없었어요'],
  ['맞다', '맞아요', '맞았어요'],
  ['늦다', '늦어요', '늦었어요'],
  ['싫다', '싫어요', '싫었어요'],
];

describe('conjugateBatchimFinal (specs/vocab-v1.md Group 1)', () => {
  it.each(group1Words)('%s -> present %s, past %s', (word, present, past) => {
    expect(conjugateBatchimFinal(word, 'present')).toBe(present);
    expect(conjugateBatchimFinal(word, 'past')).toBe(past);
  });

  it('rejects an open-syllable (non-batchim) stem', () => {
    expect(() => conjugateBatchimFinal('가다', 'present')).toThrow();
  });
});

const group4Words: Array<[word: string, present: string, past: string]> = [
  ['하다', '해요', '했어요'],
  ['공부하다', '공부해요', '공부했어요'],
  ['운동하다', '운동해요', '운동했어요'],
  ['일하다', '일해요', '일했어요'],
  ['요리하다', '요리해요', '요리했어요'],
  ['좋아하다', '좋아해요', '좋아했어요'],
  ['시작하다', '시작해요', '시작했어요'],
  ['노래하다', '노래해요', '노래했어요'],
  ['전화하다', '전화해요', '전화했어요'],
  ['사랑하다', '사랑해요', '사랑했어요'],
  ['말하다', '말해요', '말했어요'],
  ['생각하다', '생각해요', '생각했어요'],
  ['청소하다', '청소해요', '청소했어요'],
  ['숙제하다', '숙제해요', '숙제했어요'],
  ['필요하다', '필요해요', '필요했어요'],
];

describe('conjugateHada (specs/vocab-v1.md Group 4)', () => {
  it.each(group4Words)('%s -> present %s, past %s', (word, present, past) => {
    expect(conjugateHada(word, 'present')).toBe(present);
    expect(conjugateHada(word, 'past')).toBe(past);
  });

  it('rejects a non-하다 word', () => {
    expect(() => conjugateHada('먹다', 'present')).toThrow();
  });
});

const group2Words: Array<[word: string, present: string, past: string]> = [
  ['가다', '가요', '갔어요'],
  ['자다', '자요', '잤어요'],
  ['사다', '사요', '샀어요'],
  ['타다', '타요', '탔어요'],
  ['만나다', '만나요', '만났어요'],
  ['서다', '서요', '섰어요'],
  ['건너다', '건너요', '건넜어요'],
  ['켜다', '켜요', '켰어요'],
  ['보내다', '보내요', '보냈어요'],
  ['지내다', '지내요', '지냈어요'],
  ['끝나다', '끝나요', '끝났어요'],
  ['일어나다', '일어나요', '일어났어요'],
];

describe('conjugateOpenElision (specs/vocab-v1.md Group 2)', () => {
  it.each(group2Words)('%s -> present %s, past %s', (word, present, past) => {
    expect(conjugateOpenElision(word, 'present')).toBe(present);
    expect(conjugateOpenElision(word, 'past')).toBe(past);
  });

  it('rejects a batchim-final stem', () => {
    expect(() => conjugateOpenElision('먹다', 'present')).toThrow();
  });

  it('rejects a diphthong-class vowel', () => {
    expect(() => conjugateOpenElision('오다', 'present')).toThrow();
  });
});

const group3Words: Array<[word: string, present: string, past: string]> = [
  ['오다', '와요', '왔어요'],
  ['보다', '봐요', '봤어요'],
  ['배우다', '배워요', '배웠어요'],
  ['마시다', '마셔요', '마셨어요'],
  ['다니다', '다녀요', '다녔어요'],
  ['기다리다', '기다려요', '기다렸어요'],
  ['주다', '줘요', '줬어요'],
  ['나오다', '나와요', '나왔어요'],
];

describe('conjugateOpenDiphthong (specs/vocab-v1.md Group 3)', () => {
  it.each(group3Words)('%s -> present %s, past %s', (word, present, past) => {
    expect(conjugateOpenDiphthong(word, 'present')).toBe(present);
    expect(conjugateOpenDiphthong(word, 'past')).toBe(past);
  });

  it('rejects a batchim-final stem', () => {
    expect(() => conjugateOpenDiphthong('먹다', 'present')).toThrow();
  });

  it('rejects an elision-class vowel', () => {
    expect(() => conjugateOpenDiphthong('가다', 'present')).toThrow();
  });
});

// Every irregular-class word from specs/vocab-v2.md, present + past,
// exercised exhaustively — same correctness bar as the v1 groups above
// (constitution.md Principle 1), since a wrong irregular conjugation is a
// bug, not a nice-to-have.

const dIrregularWords: Array<[word: string, present: string, past: string]> = [
  ['듣다', '들어요', '들었어요'],
  ['걷다', '걸어요', '걸었어요'],
  ['묻다', '물어요', '물었어요'],
  ['싣다', '실어요', '실었어요'],
];

describe('conjugateDIrregular (specs/vocab-v2.md ㄷ-irregular)', () => {
  it.each(dIrregularWords)('%s -> present %s, past %s', (word, present, past) => {
    expect(conjugateDIrregular(word, 'present')).toBe(present);
    expect(conjugateDIrregular(word, 'past')).toBe(past);
  });

  it('rejects a non-ㄷ-batchim stem', () => {
    expect(() => conjugateDIrregular('먹다', 'present')).toThrow();
  });
});

const bIrregularWords: Array<[word: string, present: string, past: string]> = [
  ['춥다', '추워요', '추웠어요'],
  ['덥다', '더워요', '더웠어요'],
  ['쉽다', '쉬워요', '쉬웠어요'],
  ['어렵다', '어려워요', '어려웠어요'],
  ['가깝다', '가까워요', '가까웠어요'],
  ['무겁다', '무거워요', '무거웠어요'],
  ['귀엽다', '귀여워요', '귀여웠어요'],
  ['눕다', '누워요', '누웠어요'],
  ['돕다', '도와요', '도왔어요'],
];

describe('conjugateBIrregular (specs/vocab-v2.md ㅂ-irregular)', () => {
  it.each(bIrregularWords)('%s -> present %s, past %s', (word, present, past) => {
    expect(conjugateBIrregular(word, 'present')).toBe(present);
    expect(conjugateBIrregular(word, 'past')).toBe(past);
  });

  it('rejects a non-ㅂ-batchim stem', () => {
    expect(() => conjugateBIrregular('먹다', 'present')).toThrow();
  });
});

const sIrregularWords: Array<[word: string, present: string, past: string]> = [
  ['짓다', '지어요', '지었어요'],
  ['낫다', '나아요', '나았어요'],
  ['붓다', '부어요', '부었어요'],
  ['젓다', '저어요', '저었어요'],
  ['긋다', '그어요', '그었어요'],
];

describe('conjugateSIrregular (specs/vocab-v2.md ㅅ-irregular)', () => {
  it.each(sIrregularWords)('%s -> present %s, past %s', (word, present, past) => {
    expect(conjugateSIrregular(word, 'present')).toBe(present);
    expect(conjugateSIrregular(word, 'past')).toBe(past);
  });

  it('rejects a non-ㅅ-batchim stem', () => {
    expect(() => conjugateSIrregular('먹다', 'present')).toThrow();
  });
});

const leuIrregularWords: Array<[word: string, present: string, past: string]> = [
  ['모르다', '몰라요', '몰랐어요'],
  ['부르다', '불러요', '불렀어요'],
  ['빠르다', '빨라요', '빨랐어요'],
  ['다르다', '달라요', '달랐어요'],
  ['고르다', '골라요', '골랐어요'],
];

describe('conjugateLeuIrregular (specs/vocab-v2.md 르-irregular)', () => {
  it.each(leuIrregularWords)('%s -> present %s, past %s', (word, present, past) => {
    expect(conjugateLeuIrregular(word, 'present')).toBe(present);
    expect(conjugateLeuIrregular(word, 'past')).toBe(past);
  });

  it('rejects a non-르-final stem', () => {
    expect(() => conjugateLeuIrregular('먹다', 'present')).toThrow();
  });
});

const hIrregularWords: Array<[word: string, present: string, past: string]> = [
  ['그렇다', '그래요', '그랬어요'],
  ['빨갛다', '빨개요', '빨갰어요'],
  ['파랗다', '파래요', '파랬어요'],
  ['노랗다', '노래요', '노랬어요'],
  ['하얗다', '하얘요', '하얬어요'],
];

describe('conjugateHIrregularDescriptive (specs/vocab-v2.md ㅎ-irregular)', () => {
  it.each(hIrregularWords)('%s -> present %s, past %s', (word, present, past) => {
    expect(conjugateHIrregularDescriptive(word, 'present')).toBe(present);
    expect(conjugateHIrregularDescriptive(word, 'past')).toBe(past);
  });

  it('rejects a non-ㅎ-batchim stem', () => {
    expect(() => conjugateHIrregularDescriptive('먹다', 'present')).toThrow();
  });

  it('rejects a regular ㅎ-final stem (v1 좋다 is not irregular)', () => {
    // 좋다's medial is ㅗ, which has no entry in the ㅎ-irregular vowel-merge
    // table (only ㅏ/ㅓ/ㅑ do) — asserts this function can't silently
    // mishandle it even if it were ever called directly.
    expect(() => conjugateHIrregularDescriptive('좋다', 'present')).toThrow();
  });
});

const euContractionWords: Array<[word: string, present: string, past: string]> = [
  ['쓰다', '써요', '썼어요'],
  ['크다', '커요', '컸어요'],
  ['아프다', '아파요', '아팠어요'],
  ['바쁘다', '바빠요', '바빴어요'],
  ['기쁘다', '기뻐요', '기뻤어요'],
  ['고프다', '고파요', '고팠어요'],
];

describe('conjugateEuContraction (specs/vocab-v2.md ㅡ-contraction)', () => {
  it.each(euContractionWords)('%s -> present %s, past %s', (word, present, past) => {
    expect(conjugateEuContraction(word, 'present')).toBe(present);
    expect(conjugateEuContraction(word, 'past')).toBe(past);
  });

  it('rejects a non-open-ㅡ stem', () => {
    expect(() => conjugateEuContraction('먹다', 'present')).toThrow();
  });
});

describe('conjugate (auto-detecting dispatcher)', () => {
  const allWords = [
    ...group1Words,
    ...group2Words,
    ...group3Words,
    ...group4Words,
    ...dIrregularWords,
    ...bIrregularWords,
    ...sIrregularWords,
    ...leuIrregularWords,
    ...hIrregularWords,
    ...euContractionWords,
  ];

  it.each(allWords)('%s matches its pattern-group function (present %s, past %s)', (word, present, past) => {
    expect(conjugate(word, 'present')).toBe(present);
    expect(conjugate(word, 'past')).toBe(past);
  });
});
