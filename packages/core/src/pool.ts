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
