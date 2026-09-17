// Permanent dictionary bonus (constitution.md Section 3.3 / Open Decisions
// Log): the +50 "new word overall" bonus fires the first time a base word
// ever reaches its past-form stage, tracked independently of any single
// session. Persisting the dictionary itself is a web-layer concern
// (localStorage survives across sessions); this stays a pure function so
// the bonus/new-word logic is unit-testable like the rest of core.

export const NEW_WORD_BONUS = 50;

export interface DictionaryUpdate {
  /** Existing dictionary plus any newly-added words, in learned order. */
  dictionary: string[];
  /** Words from this update that were not already in the dictionary. */
  newWords: string[];
  /** NEW_WORD_BONUS times the number of newWords. */
  bonus: number;
}

/**
 * completedWords are words that just reached past-stage in this move
 * (see MoveResult.completedWords in board.ts). A word already present in
 * `dictionary` earns no further bonus on later completions.
 */
export function updateDictionary(
  dictionary: readonly string[],
  completedWords: readonly string[],
): DictionaryUpdate {
  const seen = new Set(dictionary);
  const newWords: string[] = [];

  for (const word of completedWords) {
    if (seen.has(word)) continue;
    seen.add(word);
    newWords.push(word);
  }

  return {
    dictionary: [...dictionary, ...newWords],
    newWords,
    bonus: newWords.length * NEW_WORD_BONUS,
  };
}
