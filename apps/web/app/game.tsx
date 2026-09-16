'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Board, Direction, Tile as CoreTile } from 'core';
import {
  BOARD_SIZE,
  VOCAB,
  createEmptyBoard,
  createInitialBoard,
  isGameOver,
  move,
  spawnTile,
} from 'core';
import { ThemeToggle } from './theme-toggle';
import styles from './game.module.css';

// v1 scope note: this is the gameplay loop only (board, moves, session +
// best score). The permanent dictionary, +50 new-word bonus, and the
// dictionary panel are a separate feature layered on top later — see
// constitution.md's v1 checklist.

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
}

function loadSession(): SessionState | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.board) || typeof parsed.score !== 'number') {
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

function tileClassName(tile: CoreTile): string {
  if (tile.kind === 'stem') return styles.stem;
  if (tile.kind === 'ending') return styles.ending;
  return tile.stage === 'present' ? styles.wordPresent : styles.wordPast;
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

export function Game() {
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore a persisted session on mount, or start a fresh one. Runs once,
  // client-side only — the server/first-paint render always shows the
  // empty board so there's no hydration mismatch.
  useEffect(() => {
    const saved = loadSession();
    if (saved) {
      setBoard(saved.board);
      setScore(saved.score);
      setGameOver(isGameOver(saved.board));
    } else {
      const initial = createInitialBoard(VOCAB);
      setBoard(initial);
      persistSession({ board: initial, score: 0 });
    }
    setBestScore(loadBestScore());
    setHydrated(true);
  }, []);

  const handleMove = useCallback(
    (direction: Direction) => {
      if (gameOver) return;
      const result = move(board, direction);
      if (!result.moved) return;

      const nextBoard = spawnTile(result.board, VOCAB);
      const nextScore = score + result.scoreDelta;

      setBoard(nextBoard);
      setScore(nextScore);
      persistSession({ board: nextBoard, score: nextScore });

      if (nextScore > bestScore) {
        setBestScore(nextScore);
        persistBestScore(nextScore);
      }

      if (isGameOver(nextBoard)) {
        setGameOver(true);
      }
    },
    [board, score, bestScore, gameOver],
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
    const initial = createInitialBoard(VOCAB);
    setBoard(initial);
    setScore(0);
    setGameOver(false);
    persistSession({ board: initial, score: 0 });
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
        {tiles.map(({ tile, row, col }) => (
          <div
            key={tile.id}
            className={`${styles.tile} ${tileClassName(tile)}`}
            style={{ '--row': row, '--col': col } as CSSProperties}
          >
            {tileLabel(tile)}
          </div>
        ))}
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
