import type { VocabEntry } from './vocab';

// Active-word rotation (constitution.md Section 8): rather than drawing
// stems from the entire 62-word vocabulary at once, only a small "pool"
// of words is in rotation at any time, so the same few words recur often
// enough to actually learn them. Completing a pool word retires it and
// draws a replacement.

export interface Pool {
  /** Words currently in rotation — stems only spawn from this list. */
  active: string[];
  /** Words that have been fully conjugated and retired from the pool. */
  completed: string[];
}

function shuffle<T>(items: readonly T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function createPool(vocab: readonly VocabEntry[], size: number): Pool {
  const words = shuffle(vocab.map((entry) => entry.word));
  return { active: words.slice(0, Math.min(size, words.length)), completed: [] };
}

export interface AdvancePoolResult {
  pool: Pool;
  /** Newly drawn replacement words, in the same order as completedWords. */
  added: string[];
}

/**
 * Retires each completed word from the active pool and draws a
 * replacement from whatever vocab words are neither already active nor
 * already completed. If the whole vocabulary has been used up, the pool
 * simply shrinks for that slot instead of erroring.
 */
export function advancePool(
  pool: Pool,
  completedWords: readonly string[],
  vocab: readonly VocabEntry[],
): AdvancePoolResult {
  const active = pool.active.slice();
  const completed = pool.completed.slice();
  const added: string[] = [];
  const allWords = vocab.map((entry) => entry.word);

  for (const word of completedWords) {
    const index = active.indexOf(word);
    if (index === -1) continue; // not an active pool word — nothing to do

    active.splice(index, 1);
    completed.push(word);

    const unused = allWords.filter((w) => !active.includes(w) && !completed.includes(w));
    if (unused.length > 0) {
      const replacement = unused[Math.floor(Math.random() * unused.length)];
      active.push(replacement);
      added.push(replacement);
    }
  }

  return { pool: { active, completed }, added };
}

/**
 * Spaced-review resurfacing (constitution.md Section 3.2 / Open Decisions
 * Log): the active pool alone means a word never appears again once
 * completed — great for first-time learning, bad for memorization. With
 * probability `reviewChance`, offer one already-in-the-dictionary word
 * (excluding whatever is currently active, since those already get their
 * own priority via analyzeBoardNeeds) as an extra stem-spawn candidate.
 * Returns null when the roll fails or there's no eligible word — the
 * caller then spawns from the active pool alone, unchanged.
 */
export function pickReviewWord(
  learnedWords: readonly string[],
  activePool: readonly string[],
  reviewChance: number,
  random: () => number = Math.random,
): string | null {
  if (random() >= reviewChance) return null;

  const active = new Set(activePool);
  const candidates = learnedWords.filter((word) => !active.has(word));
  if (candidates.length === 0) return null;

  return candidates[Math.floor(random() * candidates.length)];
}
