// Shared word lookups + pronunciation (dictionary persistence itself now
// lives behind progress-store.ts) — used by
// both Game (Normal/Hard, which writes to it) and Concentration (which only
// reads from it: concentration matches stay purely session-scored, see
// specs/game-modes-v2.md). The permanent dictionary itself is one shared
// store across all three modes (constitution.md v2 checklist).

import type { VocabEntry } from 'core';
import { VOCAB } from 'core';

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
