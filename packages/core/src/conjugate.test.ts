import { describe, expect, it } from 'vitest';
import { conjugateBatchimFinal, conjugateHada } from './conjugate';

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
