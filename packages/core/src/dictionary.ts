// Permanent dictionary bonus (constitution.md Section 3.3 / Open Decisions
// Log): the +50 "new word overall" bonus fires the first time a base word
// ever reaches its past-form stage, tracked independently of any single
// session. Persisting the dictionary itself is a web-layer concern
// (localStorage survives across sessions); this stays a pure function so
// the bonus/new-word logic is unit-testable like the rest of core.
//
// Each entry also tracks a mastery `count` — how many times that word has
// ever reached past-stage, across all sessions — surfaced in the
// dictionary panel so a learner can see which words they've drilled a lot
// vs. only once. It's the same event that (for a first-time word) awards
// the bonus, so one update function tracks both.
//
// `bookmarked` (specs/ui-v2.md) is a player-toggled star, unrelated to
// game progress — updateDictionary carries it through untouched on every
// call, and toggleBookmark is the only thing that changes it.

export const NEW_WORD_BONUS = 50;

export interface DictionaryEntry {
  word: string;
  /** Times this word has reached past-stage, ever (>= 1). */
  count: number;
  /** Player-toggled star (specs/ui-v2.md dictionary UI). */
  bookmarked: boolean;
}

export interface DictionaryUpdate {
  /** Existing dictionary plus any newly-added words, in learned order. */
  dictionary: DictionaryEntry[];
  /** Words from this update that were not already in the dictionary. */
  newWords: string[];
  /** NEW_WORD_BONUS times the number of newWords. */
  bonus: number;
}

/**
 * completedWords are words that just reached past-stage in this move
 * (see MoveResult.completedWords in board.ts). A word already present in
 * `dictionary` earns no further bonus on later completions, but its
 * mastery count still increments.
 */
export function updateDictionary(
  dictionary: readonly DictionaryEntry[],
  completedWords: readonly string[],
): DictionaryUpdate {
  const counts = new Map(dictionary.map((entry) => [entry.word, entry.count]));
  const bookmarks = new Map(dictionary.map((entry) => [entry.word, entry.bookmarked]));
  const order = dictionary.map((entry) => entry.word);
  const newWords: string[] = [];

  for (const word of completedWords) {
    if (!counts.has(word)) {
      counts.set(word, 0);
      bookmarks.set(word, false);
      order.push(word);
      newWords.push(word);
    }
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }

  return {
    dictionary: order.map((word) => ({
      word,
      count: counts.get(word) ?? 0,
      bookmarked: bookmarks.get(word) ?? false,
    })),
    newWords,
    bonus: newWords.length * NEW_WORD_BONUS,
  };
}

/**
 * Toggles one dictionary entry's bookmark flag — a pure, unit-testable
 * companion to updateDictionary for the v2 dictionary UI's star feature
 * (specs/ui-v2.md). No-op if the word isn't in the dictionary.
 */
export function toggleBookmark(
  dictionary: readonly DictionaryEntry[],
  word: string,
): DictionaryEntry[] {
  return dictionary.map((entry) =>
    entry.word === word ? { ...entry, bookmarked: !entry.bookmarked } : entry,
  );
}
