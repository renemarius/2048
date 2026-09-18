import { describe, expect, it } from 'vitest';
import {
  CONCENTRATION_PAIR_COUNT,
  createConcentrationDeck,
  isMatch,
  type ConcentrationSourceEntry,
} from './concentration';

const ENTRIES: ConcentrationSourceEntry[] = [
  { word: '먹다', meaning: 'eat' },
  { word: '가다', meaning: 'go' },
  { word: '읽다', meaning: 'read' },
  { word: '받다', meaning: 'receive' },
  { word: '앉다', meaning: 'sit' },
  { word: '웃다', meaning: 'laugh/smile' },
  { word: '씻다', meaning: 'wash' },
  { word: '신다', meaning: 'wear (shoes)' },
  { word: '입다', meaning: 'wear (clothes)' },
  { word: '놀다', meaning: 'play' },
];

describe('createConcentrationDeck', () => {
  it('builds two cards per pair, one word and one meaning', () => {
    const deck = createConcentrationDeck(ENTRIES, 8);
    expect(deck).toHaveLength(16);
    expect(deck.filter((c) => c.type === 'word')).toHaveLength(8);
    expect(deck.filter((c) => c.type === 'meaning')).toHaveLength(8);
  });

  it('every word card has a matching meaning card for the same word', () => {
    const deck = createConcentrationDeck(ENTRIES, 8);
    const words = new Set(deck.filter((c) => c.type === 'word').map((c) => c.word));
    const meanings = new Set(deck.filter((c) => c.type === 'meaning').map((c) => c.word));
    expect(words).toEqual(meanings);
  });

  it('every card has a unique id', () => {
    const deck = createConcentrationDeck(ENTRIES, 8);
    expect(new Set(deck.map((c) => c.id)).size).toBe(deck.length);
  });

  it('shuffles the deck (different random sequences produce different orders)', () => {
    const seqA = [0.9, 0.1, 0.5, 0.2, 0.8, 0.3, 0.6, 0.4, 0.7, 0.05, 0.95, 0.25, 0.55, 0.15, 0.65];
    const seqB = [0.05, 0.95, 0.15, 0.85, 0.25, 0.75, 0.35, 0.65, 0.45, 0.55, 0.1, 0.9, 0.2, 0.8, 0.3];
    let i = 0;
    const randomA = () => seqA[i++ % seqA.length];
    let j = 0;
    const randomB = () => seqB[j++ % seqB.length];
    const deckA = createConcentrationDeck(ENTRIES, 8, randomA).map((c) => c.id);
    const deckB = createConcentrationDeck(ENTRIES, 8, randomB).map((c) => c.id);
    expect(deckA).not.toEqual(deckB);
  });

  it('draws fewer pairs than requested when entries run short, without repeating a word', () => {
    const small = ENTRIES.slice(0, 3);
    const deck = createConcentrationDeck(small, CONCENTRATION_PAIR_COUNT);
    expect(deck).toHaveLength(6);
    const words = deck.filter((c) => c.type === 'word').map((c) => c.word);
    expect(new Set(words).size).toBe(3);
  });

  it('returns an empty deck for an empty entry list', () => {
    expect(createConcentrationDeck([], CONCENTRATION_PAIR_COUNT)).toEqual([]);
  });
});

describe('isMatch', () => {
  it('matches a word card and a meaning card for the same word', () => {
    const deck = createConcentrationDeck(ENTRIES, 8);
    const wordCard = deck.find((c) => c.type === 'word')!;
    const meaningCard = deck.find((c) => c.type === 'meaning' && c.word === wordCard.word)!;
    expect(isMatch(wordCard, meaningCard)).toBe(true);
  });

  it('does not match two cards for different words', () => {
    const deck = createConcentrationDeck(ENTRIES, 8);
    const [a, b] = deck;
    const other = deck.find((c) => c.word !== a.word)!;
    expect(isMatch(a, other)).toBe(false);
    void b;
  });

  it('does not match a card against itself', () => {
    const deck = createConcentrationDeck(ENTRIES, 8);
    expect(isMatch(deck[0], deck[0])).toBe(false);
  });

  it('does not match two word cards for the same word (there is only ever one)', () => {
    const deck = createConcentrationDeck(ENTRIES, 8);
    const wordCard = deck.find((c) => c.type === 'word')!;
    const sameTypeSameWord = deck.find((c) => c.type === 'word' && c.word === wordCard.word && c.id !== wordCard.id);
    expect(sameTypeSameWord).toBeUndefined();
  });
});
