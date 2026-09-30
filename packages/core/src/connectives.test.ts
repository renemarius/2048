import { describe, expect, it } from 'vitest';
import {
  CONNECTIVES,
  CONNECTIVE_BASE_POINTS,
  CONNECTIVE_SESSION_LENGTH,
  buildSentence,
  checkAnswer,
  conjugateConnective,
  createSentenceSession,
  scoreAnswer,
  splitExampleSentence,
  streakMultiplier,
} from './connectives';
import { conjugate } from './conjugate';
import { VOCAB, type VocabEntry } from './vocab';

// Hand-verified expected forms, deliberately written out rather than
// derived from the engine so the suite can't just echo it (Principle 1).
// -고 / -지만 are stem + suffix for every class, asserted separately below.
const seoAndMyeon: Array<[word: string, aseo: string, myeon: string]> = [
  // Level 1, Group 1 — batchim-final (ㄹ-batchim stems drop 으 before 면)
  ['먹다', '먹어서', '먹으면'],
  ['읽다', '읽어서', '읽으면'],
  ['받다', '받아서', '받으면'],
  ['앉다', '앉아서', '앉으면'],
  ['웃다', '웃어서', '웃으면'],
  ['씻다', '씻어서', '씻으면'],
  ['신다', '신어서', '신으면'],
  ['입다', '입어서', '입으면'],
  ['놀다', '놀아서', '놀면'],
  ['살다', '살아서', '살면'],
  ['알다', '알아서', '알면'],
  ['열다', '열어서', '열면'],
  ['닫다', '닫아서', '닫으면'],
  ['믿다', '믿어서', '믿으면'],
  ['좋다', '좋아서', '좋으면'],
  ['많다', '많아서', '많으면'],
  ['작다', '작아서', '작으면'],
  ['높다', '높아서', '높으면'],
  ['짧다', '짧아서', '짧으면'],
  ['길다', '길어서', '길면'],
  ['찾다', '찾아서', '찾으면'],
  ['잡다', '잡아서', '잡으면'],
  ['있다', '있어서', '있으면'],
  ['없다', '없어서', '없으면'],
  ['맞다', '맞아서', '맞으면'],
  ['늦다', '늦어서', '늦으면'],
  ['싫다', '싫어서', '싫으면'],
  // Group 2 — open, elision
  ['가다', '가서', '가면'],
  ['자다', '자서', '자면'],
  ['사다', '사서', '사면'],
  ['타다', '타서', '타면'],
  ['만나다', '만나서', '만나면'],
  ['서다', '서서', '서면'],
  ['건너다', '건너서', '건너면'],
  ['켜다', '켜서', '켜면'],
  ['보내다', '보내서', '보내면'],
  ['지내다', '지내서', '지내면'],
  ['끝나다', '끝나서', '끝나면'],
  ['일어나다', '일어나서', '일어나면'],
  // Group 3 — open, diphthong (only the 서 form fuses)
  ['오다', '와서', '오면'],
  ['보다', '봐서', '보면'],
  ['배우다', '배워서', '배우면'],
  ['마시다', '마셔서', '마시면'],
  ['다니다', '다녀서', '다니면'],
  ['기다리다', '기다려서', '기다리면'],
  ['주다', '줘서', '주면'],
  ['나오다', '나와서', '나오면'],
  // Group 4 — 하다-verbs
  ['하다', '해서', '하면'],
  ['공부하다', '공부해서', '공부하면'],
  ['운동하다', '운동해서', '운동하면'],
  ['일하다', '일해서', '일하면'],
  ['요리하다', '요리해서', '요리하면'],
  ['좋아하다', '좋아해서', '좋아하면'],
  ['시작하다', '시작해서', '시작하면'],
  ['노래하다', '노래해서', '노래하면'],
  ['전화하다', '전화해서', '전화하면'],
  ['사랑하다', '사랑해서', '사랑하면'],
  ['말하다', '말해서', '말하면'],
  ['생각하다', '생각해서', '생각하면'],
  ['청소하다', '청소해서', '청소하면'],
  ['숙제하다', '숙제해서', '숙제하면'],
  ['필요하다', '필요해서', '필요하면'],
  // Level 2 — ㄷ-irregular (derived ㄹ keeps 으: 들으면, unlike 살면)
  ['듣다', '들어서', '들으면'],
  ['걷다', '걸어서', '걸으면'],
  ['묻다', '물어서', '물으면'],
  ['싣다', '실어서', '실으면'],
  // ㅂ-irregular (돕다 is 도와서 but 도우면 — 오/와 only applies to 아/어)
  ['춥다', '추워서', '추우면'],
  ['덥다', '더워서', '더우면'],
  ['쉽다', '쉬워서', '쉬우면'],
  ['어렵다', '어려워서', '어려우면'],
  ['가깝다', '가까워서', '가까우면'],
  ['무겁다', '무거워서', '무거우면'],
  ['귀엽다', '귀여워서', '귀여우면'],
  ['눕다', '누워서', '누우면'],
  ['돕다', '도와서', '도우면'],
  // ㅅ-irregular
  ['짓다', '지어서', '지으면'],
  ['낫다', '나아서', '나으면'],
  ['붓다', '부어서', '부으면'],
  ['젓다', '저어서', '저으면'],
  ['긋다', '그어서', '그으면'],
  // 르-irregular (only the 서 form doubles ㄹ)
  ['모르다', '몰라서', '모르면'],
  ['부르다', '불러서', '부르면'],
  ['빠르다', '빨라서', '빠르면'],
  ['다르다', '달라서', '다르면'],
  ['고르다', '골라서', '고르면'],
  // ㅎ-irregular (서 merges to ㅐ; 면 just drops ㅎ, no merge, no 으)
  ['그렇다', '그래서', '그러면'],
  ['빨갛다', '빨개서', '빨가면'],
  ['파랗다', '파래서', '파라면'],
  ['노랗다', '노래서', '노라면'],
  ['하얗다', '하얘서', '하야면'],
  // ㅡ-contraction (only the 서 form fuses)
  ['쓰다', '써서', '쓰면'],
  ['크다', '커서', '크면'],
  ['아프다', '아파서', '아프면'],
  ['바쁘다', '바빠서', '바쁘면'],
  ['기쁘다', '기뻐서', '기쁘면'],
  ['고프다', '고파서', '고프면'],
];

const byWord = (word: string): VocabEntry => {
  const entry = VOCAB.find((e) => e.word === word);
  if (!entry) throw new Error(`no vocab entry for ${word}`);
  return entry;
};

// Deterministic rng so composition tests aren't flaky.
function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('connective conjugation', () => {
  it('the table covers every vocab word exactly once', () => {
    expect(seoAndMyeon.map(([w]) => w).sort()).toEqual(VOCAB.map((e) => e.word).sort());
  });

  it.each(seoAndMyeon)('%s -> -아서/어서 %s', (word, aseo) => {
    expect(conjugateConnective(word, 'aseo')).toBe(aseo);
  });

  it.each(seoAndMyeon)('%s -> -(으)면 (%s, %s)', (word, _aseo, myeon) => {
    expect(conjugateConnective(word, 'myeon')).toBe(myeon);
  });

  it('-고 and -지만 are the bare stem plus the suffix for every word', () => {
    for (const { word } of VOCAB) {
      const stem = word.slice(0, -1);
      expect(conjugateConnective(word, 'go')).toBe(`${stem}고`);
      expect(conjugateConnective(word, 'jiman')).toBe(`${stem}지만`);
    }
  });
});

describe('example sentences as connective hosts', () => {
  it('every example sentence ends with its own present-polite form', () => {
    for (const entry of VOCAB) {
      const { head, present } = splitExampleSentence(entry);
      expect(head + present + '.').toBe(entry.exampleSentence);
      expect(present).toBe(conjugate(entry.word, 'present'));
    }
  });

  it('rejects a sentence that does not end with the word', () => {
    expect(() =>
      splitExampleSentence({ word: '먹다', meaning: 'eat', exampleSentence: '먹어요 저는.', exampleTranslation: '' }),
    ).toThrow();
  });
});

describe('buildSentence', () => {
  const eat = byWord('먹다');
  const read = byWord('읽다');

  it('composes the spec example, dropping the repeated 저는', () => {
    const q = buildSentence(eat, read, 'go', VOCAB, seeded(1));
    expect(q.korean).toBe('저는 아침을 먹고 책을 읽어요.');
    expect(q.answer).toEqual(['저는', '아침을', '먹고', '책을', '읽어요']);
    expect(q.english).toBe('I eat breakfast, and I read a book.');
  });

  it('applies each English template', () => {
    expect(buildSentence(eat, read, 'jiman', VOCAB, seeded(1)).english).toBe(
      'I eat breakfast, but I read a book.',
    );
    expect(buildSentence(eat, read, 'aseo', VOCAB, seeded(1)).english).toBe(
      'Because I eat breakfast, I read a book.',
    );
    expect(buildSentence(eat, read, 'myeon', VOCAB, seeded(1)).english).toBe(
      'If I eat breakfast, I read a book.',
    );
  });

  it('lowercases a non-I clause mid-sentence but keeps I and Korean capitalized', () => {
    const baby = byWord('웃다');
    const q = buildSentence(baby, eat, 'aseo', VOCAB, seeded(1));
    expect(q.english).toBe('Because the baby laughs, I eat breakfast.');
    const korean = byWord('어렵다');
    expect(buildSentence(eat, korean, 'go', VOCAB, seeded(1)).english).toBe(
      'I eat breakfast, and Korean is difficult.',
    );
  });

  it('keeps B\'s subject when A does not start with 저는', () => {
    const q = buildSentence(byWord('웃다'), read, 'go', VOCAB, seeded(1));
    expect(q.korean).toBe('아기가 웃고 저는 책을 읽어요.');
  });

  it('tokens rejoin to the Korean sentence minus punctuation, for every word pair sampled', () => {
    const random = seeded(7);
    for (let i = 0; i < 300; i += 1) {
      const a = VOCAB[Math.floor(random() * VOCAB.length)];
      const b = VOCAB[Math.floor(random() * VOCAB.length)];
      if (a.word === b.word) continue;
      const connective = CONNECTIVES[i % CONNECTIVES.length];
      const q = buildSentence(a, b, connective, VOCAB, random);
      expect(q.answer.join(' ')).toBe(q.korean.replace(/[.,!?]/g, ''));
      expect(q.answer).toContain(conjugateConnective(a.word, connective));
    }
  });

  it('distractors never equal a correct tile and never repeat', () => {
    const random = seeded(11);
    for (let i = 0; i < 300; i += 1) {
      const a = VOCAB[Math.floor(random() * VOCAB.length)];
      const b = VOCAB[Math.floor(random() * VOCAB.length)];
      if (a.word === b.word) continue;
      const q = buildSentence(a, b, CONNECTIVES[i % CONNECTIVES.length], VOCAB, random);
      expect(q.distractors.length).toBeGreaterThanOrEqual(2);
      expect(q.distractors.length).toBeLessThanOrEqual(3);
      expect(new Set(q.distractors).size).toBe(q.distractors.length);
      for (const d of q.distractors) expect(q.answer).not.toContain(d);
    }
  });

  it('includes a wrong-connective form and the plain present form of A as distractors', () => {
    const q = buildSentence(eat, read, 'go', VOCAB, seeded(3));
    expect(q.distractors).toContain('먹어요');
    const wrongForms = ['먹지만', '먹어서', '먹으면'];
    expect(q.distractors.some((d) => wrongForms.includes(d))).toBe(true);
  });

  it('bank is exactly the answer tiles plus distractors', () => {
    const q = buildSentence(eat, read, 'aseo', VOCAB, seeded(5));
    expect([...q.bank].sort()).toEqual([...q.answer, ...q.distractors].sort());
  });

  it('still builds with only four learned words to draw distractors from', () => {
    const pool = [eat, read, byWord('가다'), byWord('웃다')];
    const q = buildSentence(eat, read, 'myeon', pool, seeded(2));
    expect(q.distractors.length).toBeGreaterThanOrEqual(2);
  });

  it('refuses two identical words', () => {
    expect(() => buildSentence(eat, eat, 'go', VOCAB)).toThrow();
  });
});

describe('checkAnswer', () => {
  const q = buildSentence(byWord('먹다'), byWord('읽다'), 'go', VOCAB, seeded(1));

  it('accepts only the exact sequence', () => {
    expect(checkAnswer(q, q.answer)).toBe(true);
    expect(checkAnswer(q, [...q.answer].reverse())).toBe(false);
    expect(checkAnswer(q, q.answer.slice(0, -1))).toBe(false);
    expect(checkAnswer(q, [...q.answer, q.distractors[0]])).toBe(false);
    expect(checkAnswer(q, [])).toBe(false);
  });

  it('rejects a distractor swapped in for the right connective form', () => {
    const wrong = q.answer.map((t) => (t === '먹고' ? '먹어요' : t));
    expect(checkAnswer(q, wrong)).toBe(false);
  });
});

describe('createSentenceSession', () => {
  const learned = ['먹다', '읽다', '가다', '웃다', '좋다'].map(byWord);

  it('builds the fixed session length with A != B in every question', () => {
    const session = createSentenceSession(learned, CONNECTIVE_SESSION_LENGTH, seeded(9));
    expect(session).toHaveLength(10);
    for (const q of session) expect(q.wordA).not.toBe(q.wordB);
  });

  it('uses every connective in a session', () => {
    const session = createSentenceSession(learned, 10, seeded(4));
    expect(new Set(session.map((q) => q.connective))).toEqual(new Set(CONNECTIVES));
  });

  it('only draws words from the learned list', () => {
    const allowed = new Set(learned.map((e) => e.word));
    for (const q of createSentenceSession(learned, 10, seeded(6))) {
      expect(allowed.has(q.wordA)).toBe(true);
      expect(allowed.has(q.wordB)).toBe(true);
    }
  });

  it('works with the minimum of four words', () => {
    expect(createSentenceSession(learned.slice(0, 4), 10, seeded(8))).toHaveLength(10);
  });
});

describe('scoring', () => {
  it('multiplier thresholds: x1 for 1-2, x2 from 3, x3 from 5, capped', () => {
    expect([1, 2, 3, 4, 5, 6, 20].map(streakMultiplier)).toEqual([1, 1, 2, 2, 3, 3, 3]);
  });

  it('scores base points, growing with the streak', () => {
    let streak = 0;
    const points: number[] = [];
    for (let i = 0; i < 6; i += 1) {
      const result = scoreAnswer(streak, true);
      streak = result.streak;
      points.push(result.points);
    }
    expect(points).toEqual([10, 10, 20, 20, 30, 30]);
    expect(points[0]).toBe(CONNECTIVE_BASE_POINTS);
  });

  it('a wrong answer scores nothing and resets the streak', () => {
    expect(scoreAnswer(4, false)).toEqual({ points: 0, streak: 0 });
    expect(scoreAnswer(0, true)).toEqual({ points: 10, streak: 1 });
  });
});
