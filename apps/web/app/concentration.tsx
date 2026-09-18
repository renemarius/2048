'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ConcentrationCard, DictionaryEntry } from 'core';
import {
  CONCENTRATION_MATCH_POINTS,
  CONCENTRATION_MIN_WORDS,
  CONCENTRATION_PAIR_COUNT,
  createConcentrationDeck,
  isMatch,
} from 'core';
import { loadDictionary, meaningFor, speak } from './dictionary-storage';
import { ModeSwitcher, type GameMode } from './mode-switcher';
import { bestScoreKey } from './storage-keys';
import { ThemeToggle } from './theme-toggle';
import styles from './game.module.css';

// Concentration mode (specs/game-modes-v2.md): a standalone memory/match
// minigame drawing only on the player's existing dictionary. See
// packages/core/src/concentration.ts for the deck/match logic — this file
// is purely the flip/reveal/score UI wired to it.

const MODE: GameMode = 'concentration';

// How long a non-matching pair stays face-up before flipping back, so the
// player actually has time to read what they picked.
const MISMATCH_DELAY_MS = 900;

function newDeck(dictionary: readonly DictionaryEntry[]): ConcentrationCard[] {
  const entries = dictionary.map((entry) => ({ word: entry.word, meaning: meaningFor(entry.word) }));
  return createConcentrationDeck(entries, CONCENTRATION_PAIR_COUNT);
}

function loadBestScore(): number {
  try {
    const raw = window.localStorage.getItem(bestScoreKey(MODE));
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function persistBestScore(value: number): void {
  try {
    window.localStorage.setItem(bestScoreKey(MODE), String(value));
  } catch {
    // localStorage unavailable — the mode still works, just won't
    // remember a best score across reloads.
  }
}

export function Concentration({ onModeChange }: { mode: GameMode; onModeChange: (mode: GameMode) => void }) {
  const [dictionaryCount, setDictionaryCount] = useState(0);
  const [deck, setDeck] = useState<ConcentrationCard[]>([]);
  const [revealedIds, setRevealedIds] = useState<string[]>([]);
  const [matchedWords, setMatchedWords] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [locked, setLocked] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const mismatchTimeoutRef = useRef<number | null>(null);

  const startNewGame = useCallback((dictionary: readonly DictionaryEntry[]) => {
    setDeck(newDeck(dictionary));
    setRevealedIds([]);
    setMatchedWords(new Set());
    setScore(0);
    setLocked(false);
  }, []);

  useEffect(() => {
    const dictionary = loadDictionary();
    setDictionaryCount(dictionary.length);
    startNewGame(dictionary);
    setBestScore(loadBestScore());
    setHydrated(true);
  }, [startNewGame]);

  useEffect(() => {
    return () => {
      if (mismatchTimeoutRef.current !== null) window.clearTimeout(mismatchTimeoutRef.current);
    };
  }, []);

  const pairCount = deck.length / 2;
  const won = hydrated && pairCount > 0 && matchedWords.size === pairCount;

  useEffect(() => {
    if (won && score > bestScore) {
      setBestScore(score);
      persistBestScore(score);
    }
  }, [won, score, bestScore]);

  function handleCardClick(card: ConcentrationCard) {
    if (locked || matchedWords.has(card.word) || revealedIds.includes(card.id)) return;

    if (revealedIds.length === 0) {
      setRevealedIds([card.id]);
      return;
    }

    const firstCard = deck.find((c) => c.id === revealedIds[0]);
    const nextRevealed = [revealedIds[0], card.id];
    setRevealedIds(nextRevealed);

    if (firstCard && isMatch(firstCard, card)) {
      setMatchedWords((prev) => new Set([...prev, card.word]));
      setScore((prev) => prev + CONCENTRATION_MATCH_POINTS);
      setRevealedIds([]);
      return;
    }

    setLocked(true);
    mismatchTimeoutRef.current = window.setTimeout(() => {
      setRevealedIds([]);
      setLocked(false);
    }, MISMATCH_DELAY_MS);
  }

  function handleNewGame() {
    if (mismatchTimeoutRef.current !== null) window.clearTimeout(mismatchTimeoutRef.current);
    startNewGame(loadDictionary());
  }

  const gridColumns = useMemo(() => Math.ceil(Math.sqrt(Math.max(deck.length, 1))), [deck.length]);

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>2048 Hangul Conjugation</h1>
        <ThemeToggle />
      </div>

      <ModeSwitcher mode={MODE} onChange={onModeChange} />

      <div className={styles.controls}>
        <div className={styles.scores}>
          <div className={styles.scoreBox}>
            <span className={styles.scoreLabel}>Score</span>
            <span className={styles.scoreValue}>{score}</span>
          </div>
          <div className={styles.scoreBox}>
            <span className={styles.scoreLabel}>Best</span>
            <span className={styles.scoreValue}>{bestScore}</span>
          </div>
        </div>
        <div className={styles.controlButtons}>
          <button type="button" className={styles.button} onClick={handleNewGame}>
            New game
          </button>
        </div>
      </div>

      {!hydrated ? null : dictionaryCount < CONCENTRATION_MIN_WORDS ? (
        <div className={styles.concentrationEmpty}>
          <p>
            Concentration draws from words you&apos;ve already learned. Learn{' '}
            <strong>{CONCENTRATION_MIN_WORDS - dictionaryCount}</strong> more word
            {CONCENTRATION_MIN_WORDS - dictionaryCount === 1 ? '' : 's'} in Normal or Hard mode to
            unlock it ({dictionaryCount}/{CONCENTRATION_MIN_WORDS}).
          </p>
          <button type="button" className={styles.button} onClick={() => onModeChange('normal')}>
            Go to Normal mode
          </button>
        </div>
      ) : (
        <>
          <div
            className={styles.concentrationGrid}
            style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}
          >
            {deck.map((card) => {
              const isRevealed = revealedIds.includes(card.id) || matchedWords.has(card.word);
              const isMatched = matchedWords.has(card.word);
              return (
                // A <button> (the speaker) can't nest inside another
                // <button> (the card) — invalid HTML, causes a hydration
                // error. Sibling buttons inside a positioning wrapper div
                // instead.
                <div key={card.id} className={styles.concentrationCardWrap}>
                  <button
                    type="button"
                    className={`${styles.concentrationCard} ${isRevealed ? styles.concentrationCardRevealed : ''} ${
                      isMatched ? styles.concentrationCardMatched : ''
                    }`}
                    onClick={() => handleCardClick(card)}
                    disabled={isMatched}
                    aria-label={isRevealed ? card.label : 'Face-down card'}
                  >
                    <span className={styles.concentrationCardFace}>{isRevealed ? card.label : '?'}</span>
                  </button>
                  {isMatched && (
                    <button
                      type="button"
                      className={styles.speakButton}
                      onClick={() => speak(card.word)}
                      aria-label={`Pronounce ${card.word}`}
                    >
                      🔊
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className={styles.hint}>Match each word to its meaning.</p>

          {won && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h2>All matched!</h2>
                <p>
                  Score: {score}
                  <br />
                  Best: {bestScore}
                </p>
                <button type="button" className={styles.button} onClick={handleNewGame}>
                  Play again
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}
