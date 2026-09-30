'use client';

import { useCallback, useEffect, useState, type DragEvent } from 'react';
import type { SentenceQuestion, VocabEntry } from 'core';
import {
  CONNECTIVE_MIN_WORDS,
  CONNECTIVE_SESSION_LENGTH,
  checkAnswer,
  createSentenceSession,
  scoreAnswer,
  streakMultiplier,
} from 'core';
import { loadDictionary, speak, vocabEntryFor } from './dictionary-storage';
import { ModeSwitcher, type GameMode } from './mode-switcher';
import { bestScoreKey } from './storage-keys';
import { ThemeToggle } from './theme-toggle';
import styles from './game.module.css';

// Sentence Builder (specs/connectives-v2.md): translate an English sentence
// by ordering Korean word tiles. Click is the primary input; drag is an
// enhancement (HTML5 drag events don't fire on touch). All composition,
// checking and scoring lives in packages/core/src/connectives.ts — this
// file is only the tile/answer-row UI wired to it.

const MODE: GameMode = 'connectives';

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

function learnedEntries(): VocabEntry[] {
  return loadDictionary()
    .map((entry) => vocabEntryFor(entry.word))
    .filter((entry): entry is VocabEntry => entry !== undefined);
}

export function SentenceBuilder({ onModeChange }: { onModeChange: (mode: GameMode) => void }) {
  const [learnedCount, setLearnedCount] = useState(0);
  const [questions, setQuestions] = useState<SentenceQuestion[]>([]);
  const [index, setIndex] = useState(0);
  // Indexes into the current question's `bank`, in answer order. Indexes
  // rather than strings, since a bank can hold two identical tiles.
  const [placed, setPlaced] = useState<number[]>([]);
  const [result, setResult] = useState<'correct' | 'wrong' | null>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const startSession = useCallback(() => {
    const entries = learnedEntries();
    setLearnedCount(entries.length);
    setQuestions(entries.length >= CONNECTIVE_MIN_WORDS ? createSentenceSession(entries) : []);
    setIndex(0);
    setPlaced([]);
    setResult(null);
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setCorrectCount(0);
    setFinished(false);
  }, []);

  useEffect(() => {
    startSession();
    setBestScore(loadBestScore());
    setHydrated(true);
  }, [startSession]);

  useEffect(() => {
    if (finished && score > bestScore) {
      setBestScore(score);
      persistBestScore(score);
    }
  }, [finished, score, bestScore]);

  const question = questions[index];
  const checked = result !== null;

  function place(bankIndex: number, at: number = placed.length) {
    if (checked || placed.includes(bankIndex)) return;
    setPlaced((prev) => [...prev.slice(0, at), bankIndex, ...prev.slice(at)]);
  }

  function removeAt(position: number) {
    if (checked) return;
    setPlaced((prev) => prev.filter((_, i) => i !== position));
  }

  function moveWithinAnswer(from: number, to: number) {
    if (checked || from === to) return;
    setPlaced((prev) => {
      const next = prev.slice();
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function handleCheck() {
    if (!question || checked || placed.length === 0) return;
    const correct = checkAnswer(question, placed.map((i) => question.bank[i]));
    const scored = scoreAnswer(streak, correct);
    setResult(correct ? 'correct' : 'wrong');
    setScore((prev) => prev + scored.points);
    setStreak(scored.streak);
    setBestStreak((prev) => Math.max(prev, scored.streak));
    if (correct) setCorrectCount((prev) => prev + 1);
  }

  function handleNext() {
    if (index + 1 >= questions.length) {
      setFinished(true);
      return;
    }
    setIndex((prev) => prev + 1);
    setPlaced([]);
    setResult(null);
  }

  // Drag payload is "bank:<bankIndex>" or "answer:<position>".
  function startDrag(event: DragEvent, source: 'bank' | 'answer', value: number) {
    event.dataTransfer.setData('text/plain', `${source}:${value}`);
    event.dataTransfer.effectAllowed = 'move';
  }

  function readDrag(event: DragEvent): { source: 'bank' | 'answer'; value: number } | null {
    const [source, raw] = event.dataTransfer.getData('text/plain').split(':');
    const value = Number(raw);
    if ((source !== 'bank' && source !== 'answer') || !Number.isInteger(value)) return null;
    return { source, value };
  }

  function dropOnAnswer(event: DragEvent, at: number) {
    event.preventDefault();
    event.stopPropagation();
    const drag = readDrag(event);
    if (!drag) return;
    if (drag.source === 'bank') place(drag.value, at);
    else moveWithinAnswer(drag.value, Math.min(at, placed.length - 1));
  }

  function dropOnBank(event: DragEvent) {
    event.preventDefault();
    const drag = readDrag(event);
    if (drag?.source === 'answer') removeAt(drag.value);
  }

  const allowDrop = (event: DragEvent) => {
    if (!checked) event.preventDefault();
  };

  const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;
  const nextMultiplier = streakMultiplier(streak + 1);

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
          <div className={styles.scoreBox}>
            <span className={styles.scoreLabel}>Streak</span>
            <span className={styles.scoreValue}>{streak}</span>
          </div>
        </div>
        <div className={styles.controlButtons}>
          <button type="button" className={styles.button} onClick={startSession}>
            New game
          </button>
        </div>
      </div>

      {!hydrated ? null : learnedCount < CONNECTIVE_MIN_WORDS ? (
        <div className={styles.concentrationEmpty}>
          <p>
            Sentences are built from words you&apos;ve already learned. Learn{' '}
            <strong>{CONNECTIVE_MIN_WORDS - learnedCount}</strong> more word
            {CONNECTIVE_MIN_WORDS - learnedCount === 1 ? '' : 's'} in Normal or Hard mode to unlock
            it ({learnedCount}/{CONNECTIVE_MIN_WORDS}).
          </p>
          <button type="button" className={styles.button} onClick={() => onModeChange('normal')}>
            Go to Normal mode
          </button>
        </div>
      ) : question ? (
        <section className={styles.sentenceCard} aria-label="Sentence Builder">
          <p className={styles.sentenceProgress}>
            Sentence {index + 1} / {CONNECTIVE_SESSION_LENGTH}
            {nextMultiplier > 1 && !checked ? ` · next correct ×${nextMultiplier}` : ''}
          </p>
          <p className={styles.sentencePrompt}>{question.english}</p>

          <div
            className={styles.sentenceAnswer}
            onDragOver={allowDrop}
            onDrop={(event) => dropOnAnswer(event, placed.length)}
            aria-label="Your answer"
          >
            {placed.length === 0 && <span className={styles.sentencePlaceholder}>Tap words below</span>}
            {placed.map((bankIndex, position) => (
              <button
                key={bankIndex}
                type="button"
                className={`${styles.sentenceTile} ${styles.sentenceTilePlaced}`}
                draggable={!checked}
                onDragStart={(event) => startDrag(event, 'answer', position)}
                onDragOver={allowDrop}
                onDrop={(event) => dropOnAnswer(event, position)}
                onClick={() => removeAt(position)}
                disabled={checked}
              >
                {question.bank[bankIndex]}
              </button>
            ))}
          </div>

          <div className={styles.sentenceBank} onDragOver={allowDrop} onDrop={dropOnBank}>
            {question.bank.map((tile, bankIndex) => (
              <button
                key={bankIndex}
                type="button"
                className={`${styles.sentenceTile} ${
                  placed.includes(bankIndex) ? styles.sentenceTileUsed : ''
                }`}
                draggable={!checked && !placed.includes(bankIndex)}
                onDragStart={(event) => startDrag(event, 'bank', bankIndex)}
                onClick={() => place(bankIndex)}
                disabled={checked || placed.includes(bankIndex)}
              >
                {tile}
              </button>
            ))}
          </div>

          <div role="status" aria-live="polite">
            {result === 'correct' && (
              <p className={`${styles.sentenceFeedback} ${styles.sentenceCorrect}`}>Correct!</p>
            )}
            {result === 'wrong' && (
              <p className={`${styles.sentenceFeedback} ${styles.sentenceWrong}`}>
                Not quite. Answer: <strong>{question.korean}</strong>
              </p>
            )}
          </div>

          <div className={styles.controlButtons}>
            {checked ? (
              <>
                <button
                  type="button"
                  className={styles.button}
                  onClick={() => speak(question.korean)}
                  aria-label="Pronounce the sentence"
                >
                  🔊
                </button>
                <button type="button" className={styles.button} onClick={handleNext}>
                  {index + 1 >= questions.length ? 'See results' : 'Next'}
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.button}
                onClick={handleCheck}
                disabled={placed.length === 0}
              >
                Check
              </button>
            )}
          </div>
        </section>
      ) : null}

      {finished && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Session complete</h2>
            <p>
              Score: {score}
              <br />
              Best: {bestScore}
              <br />
              Accuracy: {correctCount}/{questions.length} ({accuracy}%)
              <br />
              Best streak: {bestStreak}
            </p>
            <button type="button" className={styles.button} onClick={startSession}>
              Play again
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
