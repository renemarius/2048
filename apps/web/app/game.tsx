'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Board, DictionaryEntry, Direction, Pool, Tile as CoreTile, VocabEntry } from 'core';
import {
  BOARD_SIZE,
  VOCAB,
  advancePool,
  clearCompletedTiles,
  createEmptyBoard,
  createInitialBoard,
  createPool,
  isGameOver,
  move,
  pickReviewWord,
  spawnTile,
  updateDictionary,
  NEW_WORD_BONUS,
} from 'core';
import { ThemeToggle } from './theme-toggle';
import styles from './game.module.css';

// Only this many words are "in rotation" on the board at once (rather
// than drawing from the full 62-word vocabulary), so the same few words
// recur often enough to actually learn them — constitution.md Section 8.
const POOL_SIZE = 4;

// Spaced-review resurfacing (constitution.md Section 3.2): on each spawn,
// this is the chance an already-learned dictionary word gets offered as
// an extra stem candidate alongside the active pool, so memorization
// keeps going instead of a word disappearing forever the moment it's
// first learned. See pool.ts's pickReviewWord.
const REVIEW_CHANCE = 0.4;

// Completing a word: the finished tile stays fully visible for
// FADE_HOLD_MS so the player actually reads what they conjugated, then
// fades out over FADE_DURATION_MS (must match the .fading CSS transition
// duration in game.module.css), then is cleared and its replacement's
// stem appears.
const FADE_HOLD_MS = 1200;
const FADE_DURATION_MS = 300;

// How long the "new word" toast stays on screen before auto-dismissing.
const TOAST_DURATION_MS = 2400;

const SESSION_KEY = '2048-hangul:session';
const BEST_SCORE_KEY = '2048-hangul:bestScore';
const DICTIONARY_KEY = '2048-hangul:dictionary';
const RULES_SEEN_KEY = '2048-hangul:rulesSeen';

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: 'up',
  w: 'up',
  W: 'up',
  ArrowDown: 'down',
  s: 'down',
  S: 'down',
  ArrowLeft: 'left',
  a: 'left',
  A: 'left',
  ArrowRight: 'right',
  d: 'right',
  D: 'right',
};

interface SessionState {
  board: Board;
  score: number;
  pool: Pool;
}

function loadSession(): SessionState | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      !parsed ||
      !Array.isArray(parsed.board) ||
      typeof parsed.score !== 'number' ||
      !parsed.pool ||
      !Array.isArray(parsed.pool.active) ||
      !Array.isArray(parsed.pool.completed)
    ) {
      // Also covers sessions saved before the active-pool feature existed
      // — those have no `pool` field, so they're treated as absent and a
      // fresh session (with a pool) is started instead.
      return null;
    }
    return parsed as SessionState;
  } catch {
    return null;
  }
}

function persistSession(state: SessionState): void {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — the game
    // still works, it just won't survive a reload.
  }
}

function loadBestScore(): number {
  try {
    const raw = window.localStorage.getItem(BEST_SCORE_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function persistBestScore(value: number): void {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(value));
  } catch {
    // see persistSession
  }
}

function loadDictionary(): DictionaryEntry[] {
  try {
    const raw = window.localStorage.getItem(DICTIONARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Back-compat: sessions saved before mastery counts existed stored
    // plain `string[]` — treat each as having been completed once.
    if (parsed.every((entry) => typeof entry === 'string')) {
      return parsed.map((word) => ({ word, count: 1 }));
    }
    if (
      parsed.every(
        (entry) =>
          entry && typeof entry.word === 'string' && typeof entry.count === 'number',
      )
    ) {
      return parsed as DictionaryEntry[];
    }
    return [];
  } catch {
    return [];
  }
}

function hasSeenRules(): boolean {
  try {
    return window.localStorage.getItem(RULES_SEEN_KEY) === 'true';
  } catch {
    return false;
  }
}

function persistRulesSeen(): void {
  try {
    window.localStorage.setItem(RULES_SEEN_KEY, 'true');
  } catch {
    // see persistSession
  }
}

function persistDictionary(entries: readonly DictionaryEntry[]): void {
  try {
    window.localStorage.setItem(DICTIONARY_KEY, JSON.stringify(entries));
  } catch {
    // see persistSession
  }
}

function vocabEntryFor(word: string): VocabEntry | undefined {
  return VOCAB.find((entry) => entry.word === word);
}

function meaningFor(word: string): string {
  return vocabEntryFor(word)?.meaning ?? '';
}

// Web Speech API pronunciation — client-side, no backend/API key, so it
// fits the same "no external service" principle as the rest of v1
// (constitution.md Principle 2/4). No-ops quietly if unsupported.
function speak(text: string): void {
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

function vocabForWords(words: readonly string[]): VocabEntry[] {
  const wordSet = new Set(words);
  return VOCAB.filter((entry) => wordSet.has(entry.word));
}

function tileClassName(tile: CoreTile, isClearing: boolean): string {
  const kindClass =
    tile.kind === 'stem'
      ? styles.stem
      : tile.kind === 'ending'
        ? styles.ending
        : tile.stage === 'present'
          ? styles.wordPresent
          : styles.wordPast;
  return isClearing ? `${kindClass} ${styles.fading}` : kindClass;
}

function tileLabel(tile: CoreTile): string {
  if (tile.kind === 'stem') return tile.word;
  if (tile.kind === 'ending') return tile.tense === 'present' ? '현재' : '과거';
  return tile.surfaceForm;
}

interface PositionedTile {
  tile: CoreTile;
  row: number;
  col: number;
}

function flattenBoard(board: Board): PositionedTile[] {
  const tiles: PositionedTile[] = [];
  board.forEach((rowTiles, row) => {
    rowTiles.forEach((cell, col) => {
      if (cell) tiles.push({ tile: cell, row, col });
    });
  });
  return tiles;
}

function newSession(): SessionState {
  const pool = createPool(VOCAB, POOL_SIZE);
  const board = createInitialBoard(vocabForWords(pool.active));
  return { board, score: 0, pool };
}

export function Game() {
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [pool, setPool] = useState<Pool>({ active: [], completed: [] });
  const [gameOver, setGameOver] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [clearingWords, setClearingWords] = useState<Set<string>>(new Set());
  const [dictionary, setDictionary] = useState<DictionaryEntry[]>([]);
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [newWordToast, setNewWordToast] = useState<string[] | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // Refs mirror the latest committed state so the delayed fade-out/clear
  // timers (see scheduleCompletion below) always act on current data even
  // if more moves happen while a completion is still pending.
  const boardRef = useRef(board);
  const scoreRef = useRef(score);
  const poolRef = useRef(pool);
  const isMountedRef = useRef(false);
  useEffect(() => {
    boardRef.current = board;
    scoreRef.current = score;
    poolRef.current = pool;
  });
  useEffect(() => {
    // Set (not just initialized) inside the effect itself so this is
    // correctly re-armed on React Strict Mode's dev-only mount -> cleanup
    // -> mount cycle. A `useRef(true)` initializer alone stays stuck at
    // `false` after that cycle's cleanup runs, since nothing ever resets
    // it back — which would silently disable every fade/clear timeout
    // below for the component's entire real lifetime in `next dev`.
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Restore a persisted session on mount, or start a fresh one. Runs once,
  // client-side only — the server/first-paint render always shows the
  // empty board so there's no hydration mismatch.
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      setBoard(saved.board);
      setScore(saved.score);
      setPool(saved.pool);
      setGameOver(isGameOver(saved.board));
    } else {
      const session = newSession();
      setBoard(session.board);
      setPool(session.pool);
      persistSession(session);
    }
    setBestScore(loadBestScore());
    setDictionary(loadDictionary());
    setHydrated(true);

    // First-ever visit (specs/ui-v2.md "Rules panel"): auto-open once so a
    // new player learns the objective and what 현재/과거 mean without
    // having to find the "?" button first. Never auto-opens again.
    if (!hasSeenRules()) {
      setRulesOpen(true);
      persistRulesSeen();
    }
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  // Runs FADE_HOLD_MS after a word completes: mark its tile(s) as fading
  // (triggers the CSS opacity/scale transition), then FADE_DURATION_MS
  // later — once that transition has actually finished on screen — retire
  // the word from the pool, clear its tiles, and spawn the replacement
  // word's stem. Reads current state via refs, not closure values, so it
  // stays correct even if the player keeps moving during the delay.
  const scheduleCompletion = useCallback((words: string[]) => {
    window.setTimeout(() => {
      if (!isMountedRef.current) return;
      setClearingWords((prev) => new Set([...prev, ...words]));

      window.setTimeout(() => {
        if (!isMountedRef.current) return;

        const { pool: nextPool, added } = advancePool(poolRef.current, words, VOCAB);
        let updatedBoard = clearCompletedTiles(boardRef.current, words);
        for (const word of added) {
          updatedBoard = spawnTile(updatedBoard, vocabForWords([word]));
        }

        setBoard(updatedBoard);
        setPool(nextPool);
        persistSession({ board: updatedBoard, score: scoreRef.current, pool: nextPool });
        setClearingWords((prev) => {
          const next = new Set(prev);
          words.forEach((w) => next.delete(w));
          return next;
        });
      }, FADE_DURATION_MS);
    }, FADE_HOLD_MS);
  }, []);

  const handleMove = useCallback(
    (direction: Direction) => {
      if (gameOver) return;
      const result = move(board, direction);
      if (!result.moved) return;

      const reviewWord = pickReviewWord(
        dictionary.map((entry) => entry.word),
        pool.active,
        REVIEW_CHANCE,
      );
      const spawnWords = reviewWord ? [...pool.active, reviewWord] : pool.active;
      const nextBoard = spawnTile(result.board, vocabForWords(spawnWords));
      const dictUpdate = updateDictionary(dictionary, result.completedWords);
      const nextScore = score + result.scoreDelta + dictUpdate.bonus;

      setBoard(nextBoard);
      setScore(nextScore);
      persistSession({ board: nextBoard, score: nextScore, pool });

      if (result.completedWords.length > 0) {
        setDictionary(dictUpdate.dictionary);
        persistDictionary(dictUpdate.dictionary);
      }

      if (dictUpdate.newWords.length > 0) {
        setNewWordToast(dictUpdate.newWords);
        if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = window.setTimeout(() => {
          setNewWordToast(null);
        }, TOAST_DURATION_MS);
      }

      if (nextScore > bestScore) {
        setBestScore(nextScore);
        persistBestScore(nextScore);
      }

      if (isGameOver(nextBoard)) {
        setGameOver(true);
      }

      if (result.completedWords.length > 0) {
        scheduleCompletion(result.completedWords);
      }
    },
    [board, score, bestScore, gameOver, pool, dictionary, scheduleCompletion],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (rulesOpen) return; // blocking modal — don't move the board underneath it
      const direction = KEY_TO_DIRECTION[event.key];
      if (direction) {
        event.preventDefault();
        handleMove(direction);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleMove, rulesOpen]);

  // The dictionary drawer is docked, not a blocking modal (constitution.md
  // Open Decisions Log) — gameplay keeps working while it's open. Escape
  // still closes it, matching standard drawer/panel conventions.
  useEffect(() => {
    if (!dictionaryOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDictionaryOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dictionaryOpen]);

  // Rules panel: blocking modal (unlike the dictionary drawer) since it's
  // reference info read once, not something kept open during play. Escape
  // closes it, same convention as the dictionary drawer.
  useEffect(() => {
    if (!rulesOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setRulesOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [rulesOpen]);

  function handleRestart() {
    const session = newSession();
    setBoard(session.board);
    setScore(0);
    setPool(session.pool);
    setGameOver(false);
    setClearingWords(new Set());
    persistSession(session);
  }

  const tiles = hydrated ? flattenBoard(board) : [];

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>2048 Hangul Conjugation</h1>
        <ThemeToggle />
      </div>

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
          <button
            type="button"
            className={styles.button}
            onClick={() => setRulesOpen(true)}
            aria-label="How to play"
          >
            ?
          </button>
          <button
            type="button"
            className={styles.button}
            onClick={() => setDictionaryOpen((open) => !open)}
            aria-expanded={dictionaryOpen}
          >
            Dictionary ({dictionary.length})
          </button>
          <button type="button" className={styles.button} onClick={handleRestart}>
            New game
          </button>
        </div>
      </div>

      {newWordToast && newWordToast.length > 0 && (
        <div className={styles.toast} role="status">
          {newWordToast.map((word) => (
            <div key={word} className={styles.toastLine}>
              New word: <strong>{word}</strong> ({meaningFor(word)}) +{NEW_WORD_BONUS}
              <button
                type="button"
                className={styles.speakButton}
                onClick={() => speak(word)}
                aria-label={`Pronounce ${word}`}
              >
                🔊
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.boardWrap}>
        <div className={styles.cellGrid}>
          {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, i) => (
            <div key={i} className={styles.emptyCell} />
          ))}
        </div>
        {tiles.map(({ tile, row, col }) => {
          const isClearing = tile.kind !== 'ending' && clearingWords.has(tile.word);
          return (
            <div
              key={tile.id}
              className={`${styles.tile} ${tileClassName(tile, isClearing)}`}
              style={{ '--row': row, '--col': col } as CSSProperties}
            >
              {tileLabel(tile)}
            </div>
          );
        })}
      </div>

      <p className={styles.hint}>Arrow keys or WASD to move.</p>

      {gameOver && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Game over</h2>
            <p>
              Score: {score}
              <br />
              Best: {bestScore}
            </p>
            <button type="button" className={styles.button} onClick={handleRestart}>
              Play again
            </button>
          </div>
        </div>
      )}

      {rulesOpen && (
        <div className={styles.modalOverlay}>
          <div className={`${styles.modal} ${styles.rulesModal}`}>
            <h2>How to play</h2>
            <p>
              Slide the whole board with arrow keys or WASD, like classic 2048. A{' '}
              <strong>stem</strong> tile (a verb/adjective, e.g. 가다) merges with a compatible{' '}
              <strong>ending</strong> tile into a conjugated <strong>word</strong> tile — that word
              tile can merge again with another ending to re-conjugate. No legal merge left
              anywhere on the board ends the game.
            </p>
            <ul className={styles.rulesList}>
              <li>
                <strong>현재</strong> — present tense
              </li>
              <li>
                <strong>과거</strong> — past tense
              </li>
            </ul>
            <p>
              Reaching past tense on a word for the first time adds it to your{' '}
              <strong>Dictionary</strong> and scores a one-time bonus.
            </p>
            <button type="button" className={styles.button} onClick={() => setRulesOpen(false)}>
              Got it
            </button>
          </div>
        </div>
      )}

      {hydrated && (
        <div
          className={`${styles.dictionaryDrawer} ${dictionaryOpen ? styles.dictionaryDrawerOpen : ''}`}
          aria-hidden={!dictionaryOpen}
        >
          <div className={styles.dictionaryPanel}>
            <div className={styles.dictionaryScreen}>
              <div className={styles.dictionaryHeader}>
                <h2>Dictionary</h2>
                <button
                  type="button"
                  className={styles.dictionaryClose}
                  onClick={() => setDictionaryOpen(false)}
                  aria-label="Close dictionary"
                  tabIndex={dictionaryOpen ? 0 : -1}
                >
                  ×
                </button>
              </div>
              <div className={styles.dictionaryListWrap}>
                {dictionary.length === 0 ? (
                  <p className={styles.dictionaryEmpty}>
                    No words learned yet — conjugate one to its past form to add it here.
                  </p>
                ) : (
                  <ul className={styles.dictionaryList}>
                    {dictionary.map(({ word, count }) => {
                      const entry = vocabEntryFor(word);
                      return (
                        <li key={word} className={styles.dictionaryRow}>
                          <div className={styles.dictionaryRowTop}>
                            <span className={styles.dictionaryWord}>{word}</span>
                            <button
                              type="button"
                              className={styles.speakButton}
                              onClick={() => speak(word)}
                              aria-label={`Pronounce ${word}`}
                              tabIndex={dictionaryOpen ? 0 : -1}
                            >
                              🔊
                            </button>
                            <span className={styles.dictionaryMastery} title="Times conjugated to past tense">
                              ×{count}
                            </span>
                            <span className={styles.dictionaryMeaning}>{entry?.meaning ?? ''}</span>
                          </div>
                          {entry && (
                            <div className={styles.dictionaryExample}>
                              <p className={styles.dictionarySentence}>{entry.exampleSentence}</p>
                              <p className={styles.dictionaryTranslation}>{entry.exampleTranslation}</p>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
