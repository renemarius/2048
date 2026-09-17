'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Board, Direction, Pool, Tile as CoreTile, VocabEntry } from 'core';
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
  spawnTile,
} from 'core';
import { ThemeToggle } from './theme-toggle';
import styles from './game.module.css';

// v1 scope note: this is the gameplay loop only (board, moves, session +
// best score, the active-word pool). The permanent dictionary, +50
// new-word bonus, and the dictionary panel are a separate feature layered
// on top later — see constitution.md's v1 checklist.

// Only this many words are "in rotation" on the board at once (rather
// than drawing from the full 62-word vocabulary), so the same few words
// recur often enough to actually learn them — constitution.md Section 8.
const POOL_SIZE = 4;

// Completing a word: the finished tile stays fully visible for
// FADE_HOLD_MS so the player actually reads what they conjugated, then
// fades out over FADE_DURATION_MS (must match the .fading CSS transition
// duration in game.module.css), then is cleared and its replacement's
// stem appears.
const FADE_HOLD_MS = 1200;
const FADE_DURATION_MS = 300;

const SESSION_KEY = '2048-hangul:session';
const BEST_SCORE_KEY = '2048-hangul:bestScore';

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
    setHydrated(true);
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

      const nextBoard = spawnTile(result.board, vocabForWords(pool.active));
      const nextScore = score + result.scoreDelta;

      setBoard(nextBoard);
      setScore(nextScore);
      persistSession({ board: nextBoard, score: nextScore, pool });

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
    [board, score, bestScore, gameOver, pool, scheduleCompletion],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const direction = KEY_TO_DIRECTION[event.key];
      if (!direction) return;
      event.preventDefault();
      handleMove(direction);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleMove]);

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
        <button type="button" className={styles.button} onClick={handleRestart}>
          New game
        </button>
      </div>

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
    </main>
  );
}
