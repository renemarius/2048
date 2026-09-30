// Sentence Builder mode (specs/connectives-v2.md): connectives link two
// clauses, so they can't be a stem+ending merge on the 2048 board. Instead
// the player translates an English sentence by ordering Korean word tiles.
// Sentences are composed from existing example sentences over the player's
// dictionary words, so grammar is guaranteed by the same engine the rest of
// the game uses — sense is not (a sentence can be semantically odd).
//
// Like Concentration, a session is purely session-scored: no mastery-count
// or dictionary writes.

import { conjugate, conjugateConditional } from './conjugate';
import type { VocabEntry } from './vocab';

export type Connective = 'go' | 'jiman' | 'aseo' | 'myeon';

export const CONNECTIVES: readonly Connective[] = ['go', 'jiman', 'aseo', 'myeon'];

export const CONNECTIVE_MIN_WORDS = 4;
export const CONNECTIVE_SESSION_LENGTH = 10;
export const CONNECTIVE_BASE_POINTS = 10;

function stripDa(word: string): string {
  if (!word.endsWith('다')) {
    throw new Error(`Expected a dictionary-form word ending in 다: ${word}`);
  }
  return word.slice(0, -1);
}

/** The clause-1 word's stem plus the connective, e.g. 먹다 + 'aseo' -> 먹어서. */
export function conjugateConnective(word: string, connective: Connective): string {
  switch (connective) {
    case 'go':
      return stripDa(word) + '고';
    case 'jiman':
      return stripDa(word) + '지만';
    case 'aseo': {
      // Reuses the 아/어 engine so every irregular class is right by
      // construction: the connective is the present form with 요 -> 서.
      const present = conjugate(word, 'present');
      return present.slice(0, -1) + '서';
    }
    case 'myeon':
      return conjugateConditional(word);
  }
}

const SUBJECT_PREFIX = '저는 ';

// Words that stay capitalized when a clause is lowercased to sit mid-sentence.
const KEEP_CAPITALIZED = new Set(['I', 'Korean', 'Seoul']);

function lowerFirst(clause: string): string {
  const firstWord = clause.split(/[\s,]/)[0].split("'")[0];
  if (KEEP_CAPITALIZED.has(firstWord)) return clause;
  return clause.charAt(0).toLowerCase() + clause.slice(1);
}

function stripTrailingPeriod(text: string): string {
  return text.endsWith('.') ? text.slice(0, -1) : text;
}

function stripPunctuation(text: string): string {
  return text.replace(/[.,!?]/g, '');
}

/**
 * Splits an example sentence into everything before its trailing
 * present-polite form. Throws if the sentence doesn't end with that
 * word's own `conjugate()` output, since it couldn't host a connective.
 */
export function splitExampleSentence(entry: VocabEntry): { head: string; present: string } {
  const present = conjugate(entry.word, 'present');
  const tail = present + '.';
  if (!entry.exampleSentence.endsWith(tail)) {
    throw new Error(`"${entry.exampleSentence}" doesn't end with ${entry.word}'s present form ${present}`);
  }
  return { head: entry.exampleSentence.slice(0, -tail.length), present };
}

function composeEnglish(connective: Connective, c1: string, c2: string): string {
  switch (connective) {
    case 'go':
      return `${c1}, and ${lowerFirst(c2)}.`;
    case 'jiman':
      return `${c1}, but ${lowerFirst(c2)}.`;
    case 'aseo':
      return `Because ${lowerFirst(c1)}, ${lowerFirst(c2)}.`;
    case 'myeon':
      return `If ${lowerFirst(c1)}, ${lowerFirst(c2)}.`;
  }
}

export interface SentenceQuestion {
  connective: Connective;
  wordA: string;
  wordB: string;
  english: string;
  /** The full correct Korean sentence, punctuation included, for revealing the answer. */
  korean: string;
  /** The correct tile order (space-separated eojeol, punctuation dropped). */
  answer: string[];
  distractors: string[];
  /** Answer tiles plus distractors, shuffled. */
  bank: string[];
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function tokensOf(sentence: string): string[] {
  return stripPunctuation(sentence).split(' ').filter(Boolean);
}

/**
 * Composes one question: A's example sentence with its verb swapped for the
 * connective form, followed by B's example sentence (dropping B's repeated
 * 저는 subject). `others` are the learned entries the unrelated distractor
 * tile is drawn from.
 */
export function buildSentence(
  a: VocabEntry,
  b: VocabEntry,
  connective: Connective,
  others: readonly VocabEntry[],
  random: () => number = Math.random,
): SentenceQuestion {
  if (a.word === b.word) {
    throw new Error('buildSentence needs two different words');
  }
  const { head: headA, present: presentA } = splitExampleSentence(a);
  const connectiveForm = conjugateConnective(a.word, connective);

  let sentenceB = b.exampleSentence;
  if (headA.startsWith(SUBJECT_PREFIX) && sentenceB.startsWith(SUBJECT_PREFIX)) {
    sentenceB = sentenceB.slice(SUBJECT_PREFIX.length);
  }

  const korean = `${headA}${connectiveForm} ${sentenceB}`;
  const answer = tokensOf(korean);
  const english = composeEnglish(
    connective,
    stripTrailingPeriod(a.exampleTranslation),
    stripTrailingPeriod(b.exampleTranslation),
  );

  const distractors: string[] = [];
  const addDistractor = (tile: string) => {
    if (!answer.includes(tile) && !distractors.includes(tile)) distractors.push(tile);
  };

  const wrongConnectives = CONNECTIVES.filter((c) => c !== connective);
  addDistractor(conjugateConnective(a.word, wrongConnectives[Math.floor(random() * wrongConnectives.length)]));
  addDistractor(presentA);

  const unrelated = shuffle(
    others.filter((entry) => entry.word !== a.word && entry.word !== b.word),
    random,
  );
  for (const entry of unrelated) {
    const candidates = shuffle(tokensOf(entry.exampleSentence), random);
    const before = distractors.length;
    for (const tile of candidates) {
      addDistractor(tile);
      if (distractors.length > before) break;
    }
    if (distractors.length > before) break;
  }

  return {
    connective,
    wordA: a.word,
    wordB: b.word,
    english,
    korean,
    answer,
    distractors,
    bank: shuffle([...answer, ...distractors], random),
  };
}

/** Correct only for the exact tile sequence — no alternative orderings accepted. */
export function checkAnswer(question: SentenceQuestion, tiles: readonly string[]): boolean {
  return tiles.length === question.answer.length && tiles.every((tile, i) => tile === question.answer[i]);
}

/**
 * Builds a session of `length` questions from the learned words. Cycles
 * through the connectives (reshuffled each cycle) so every one shows up,
 * and through a shuffled word order so words don't repeat until the
 * dictionary is exhausted.
 */
export function createSentenceSession(
  entries: readonly VocabEntry[],
  length: number = CONNECTIVE_SESSION_LENGTH,
  random: () => number = Math.random,
): SentenceQuestion[] {
  if (entries.length < 2) {
    throw new Error('createSentenceSession needs at least two learned words');
  }
  const questions: SentenceQuestion[] = [];
  let wordOrder: VocabEntry[] = [];
  let connectiveOrder: Connective[] = [];
  const nextWord = () => {
    if (wordOrder.length === 0) wordOrder = shuffle(entries, random);
    return wordOrder.pop() as VocabEntry;
  };
  for (let i = 0; i < length; i += 1) {
    if (connectiveOrder.length === 0) connectiveOrder = shuffle(CONNECTIVES, random);
    const connective = connectiveOrder.pop() as Connective;
    const a = nextWord();
    let b = nextWord();
    // Refilling wordOrder between the two draws can hand back the same word.
    while (b.word === a.word) b = nextWord();
    questions.push(buildSentence(a, b, connective, entries, random));
  }
  return questions;
}

/** ×1 for streaks 1-2, ×2 from the 3rd in a row, ×3 from the 5th (cap). */
export function streakMultiplier(streak: number): number {
  if (streak >= 5) return 3;
  if (streak >= 3) return 2;
  return 1;
}

/**
 * Scores one answer. `previousStreak` is the run of correct answers before
 * this one; a wrong answer scores 0 and resets the streak (no lives).
 */
export function scoreAnswer(
  previousStreak: number,
  correct: boolean,
): { points: number; streak: number } {
  if (!correct) return { points: 0, streak: 0 };
  const streak = previousStreak + 1;
  return { points: CONNECTIVE_BASE_POINTS * streakMultiplier(streak), streak };
}
