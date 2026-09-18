// Concentration mode (specs/game-modes-v2.md, constitution.md v2
// checklist): a standalone memory/match minigame, Korean word <-> English
// meaning, drawn only from the player's existing dictionary (words already
// learned in Normal/Hard) rather than the full vocab list — a retention
// drill on words actually taught, not a test of unseen vocabulary. Reuses
// dictionary data as its source of truth; does not duplicate word/meaning
// data of its own.
//
// Grid is fixed at 4x4 / 8 pairs (resolved OPEN decision, this session) —
// a dictionary with fewer than MIN_WORDS words can't fill a unique 8-pair
// board, so the UI shows a progress-style empty state instead of shrinking
// the grid or repeating words (which would break the "one match per word"
// premise).
//
// A correct match stays purely session-scored (resolved OPEN decision,
// this session) — it does not touch mastery counts or the permanent
// dictionary, since Concentration is a meaning-recall drill, not a
// conjugation drill.

export const CONCENTRATION_PAIR_COUNT = 8;
export const CONCENTRATION_MIN_WORDS = CONCENTRATION_PAIR_COUNT;
export const CONCENTRATION_MATCH_POINTS = 10;

export interface ConcentrationSourceEntry {
  word: string;
  meaning: string;
}

export type ConcentrationCardType = 'word' | 'meaning';

export interface ConcentrationCard {
  id: string;
  /** The base word this card belongs to — two cards share a word iff they match. */
  word: string;
  type: ConcentrationCardType;
  label: string;
}

function shuffle<T>(items: readonly T[], random: () => number): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Builds a shuffled deck of `pairCount` word/meaning pairs (2x that many
 * cards) drawn randomly from `entries`. Returns fewer pairs than requested
 * if `entries` doesn't have enough (caller should gate on
 * CONCENTRATION_MIN_WORDS before offering the mode at all).
 */
export function createConcentrationDeck(
  entries: readonly ConcentrationSourceEntry[],
  pairCount: number,
  random: () => number = Math.random,
): ConcentrationCard[] {
  const chosen = shuffle(entries, random).slice(0, Math.min(pairCount, entries.length));
  const cards: ConcentrationCard[] = chosen.flatMap((entry, index) => [
    { id: `${index}-word`, word: entry.word, type: 'word' as const, label: entry.word },
    { id: `${index}-meaning`, word: entry.word, type: 'meaning' as const, label: entry.meaning },
  ]);
  return shuffle(cards, random);
}

/** Two distinct cards for the same base word (a word card and its meaning card) match. */
export function isMatch(a: ConcentrationCard, b: ConcentrationCard): boolean {
  return a.id !== b.id && a.word === b.word;
}
