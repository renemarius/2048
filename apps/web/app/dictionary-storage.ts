// Shared dictionary read/write + word lookups + pronunciation — used by
// both Game (Normal/Hard, which writes to it) and Concentration (which only
// reads from it: concentration matches stay purely session-scored, see
// specs/game-modes-v2.md). The permanent dictionary itself is one shared
// store across all three modes (constitution.md v2 checklist).

import type { DictionaryEntry, VocabEntry } from 'core';
import { VOCAB } from 'core';

export const DICTIONARY_KEY = '2048-hangul:dictionary';

export function loadDictionary(): DictionaryEntry[] {
  try {
    const raw = window.localStorage.getItem(DICTIONARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Back-compat: sessions saved before mastery counts existed stored
    // plain `string[]` — treat each as having been completed once.
    if (parsed.every((entry) => typeof entry === 'string')) {
      return parsed.map((word) => ({ word, count: 1, bookmarked: false }));
    }
    if (
      parsed.every(
        (entry) =>
          entry && typeof entry.word === 'string' && typeof entry.count === 'number',
      )
    ) {
      // Back-compat: sessions saved before bookmarks existed are missing
      // the field entirely — default to unstarred.
      return (parsed as Array<Partial<DictionaryEntry> & { word: string; count: number }>).map(
        (entry) => ({ word: entry.word, count: entry.count, bookmarked: entry.bookmarked ?? false }),
      );
    }
    return [];
  } catch {
    return [];
  }
}

export function persistDictionary(entries: readonly DictionaryEntry[]): void {
  try {
    window.localStorage.setItem(DICTIONARY_KEY, JSON.stringify(entries));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — the game
    // still works, it just won't survive a reload.
  }
}

export function vocabEntryFor(word: string): VocabEntry | undefined {
  return VOCAB.find((entry) => entry.word === word);
}

export function meaningFor(word: string): string {
  return vocabEntryFor(word)?.meaning ?? '';
}

// Web Speech API pronunciation — client-side, no backend/API key, so it
// fits the same "no external service" principle as the rest of v1
// (constitution.md Principle 2/4). No-ops quietly if unsupported.
export function speak(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    window.speechSynthesis.speak(utterance);
  } catch {
    // Speech synthesis unavailable/blocked — silently skip, it's a nice-
    // to-have, not core functionality.
  }
}
