'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Board, DictionaryEntry, Direction, HardModeState, Pool, Tile as CoreTile, VocabEntry } from 'core';
import {
  BOARD_SIZE,
  VOCAB,
  VOCAB_LEVEL_1,
  advanceHardMode,
  advancePool,
  blockedSet,
  clearCompletedTiles,
  createEmptyBoard,
  createHardModeState,
  createInitialBoard,
  createPool,
  isGameOver,
  move,
  pickReviewWord,
  positionKey,
  spawnTile,
  toggleBookmark,
  updateDictionary,
  NEW_WORD_BONUS,
} from 'core';
import { loadDictionary, meaningFor, persistDictionary, speak, vocabEntryFor } from './dictionary-storage';
import { ModeSwitcher, type GameMode } from './mode-switcher';
import { bestScoreKey, LEGACY_BEST_SCORE_KEY, LEGACY_SESSION_KEY, sessionKey } from './storage-keys';
import { ThemeToggle } from './theme-toggle';
import styles from './game.module.css';

type NormalOrHardMode = Extract<GameMode, 'normal' | 'hard'>;

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
  /** Present only in Hard mode — the relocating dead zone (specs/game-modes-v2.md). */
  hardMode?: HardModeState;
}

// Normal mode falls back to the pre-v2 unsuffixed keys (specs/game-modes-v2.md
// "Per-mode scoring") so an existing player's in-progress board/best score
// carries forward instead of resetting the first time this ships.
function loadSession(mode: NormalOrHardMode): SessionState | null {
  try {
    const raw =
      window.localStorage.getItem(sessionKey(mode)) ??
      (mode === 'normal' ? window.localStorage.getItem(LEGACY_SESSION_KEY) : null);
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

function persistSession(mode: NormalOrHardMode, state: SessionState): void {
  try {
    window.localStorage.setItem(sessionKey(mode), JSON.stringify(state));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) — the game
    // still works, it just won't survive a reload.
  }
}

function loadBestScore(mode: NormalOrHardMode): number {
  try {
    const raw =
      window.localStorage.getItem(bestScoreKey(mode)) ??
      (mode === 'normal' ? window.localStorage.getItem(LEGACY_BEST_SCORE_KEY) : null);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function persistBestScore(mode: NormalOrHardMode, value: number): void {
  try {
    window.localStorage.setItem(bestScoreKey(mode), String(value));
  } catch {
    // see persistSession
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

function vocabForWords(words: readonly string[]): VocabEntry[] {
  const wordSet = new Set(words);
  return VOCAB.filter((entry) => wordSet.has(entry.word));
}

// Level 2 gating (specs/vocab-v2.md, constitution.md v2 checklist): the 34
// irregular-conjugation words stay out of the pool entirely until every one
// of Level 1's 62 regular words has reached past-stage at least once in the
// permanent dictionary — full completion, not a partial threshold.
function isLevel1Complete(dictionary: readonly DictionaryEntry[]): boolean {
  const learned = new Set(dictionary.map((entry) => entry.word));
  return VOCAB_LEVEL_1.every((entry) => learned.has(entry.word));
}

function unlockedVocab(dictionary: readonly DictionaryEntry[]): VocabEntry[] {
  return isLevel1Complete(dictionary) ? VOCAB : VOCAB_LEVEL_1;
}

// Level 3 gating (specs/tenses-v2.md, constitution.md v2 checklist):
// future-tense endings stay out of the spawn pool until every word across
// both unlocked vocab levels has reached a terminal stage — past *or*
// future — at least once, mirroring Level 2's own full-completion gate.
// `updateDictionary` already records a word on either terminal merge (see
// board.ts's attemptMerge), so checking the dictionary here is enough —
// no separate past-vs-future bookkeeping needed.
function isFutureUnlocked(dictionary: readonly DictionaryEntry[]): boolean {
  const learned = new Set(dictionary.map((entry) => entry.word));
  return VOCAB.every((entry) => learned.has(entry.word));
}

// Dictionary UI v2 (specs/ui-v2.md): search, filter, sort, bookmarks.
const LEVEL_1_WORDS = new Set(VOCAB_LEVEL_1.map((entry) => entry.word));

type DictionaryFilter = 'all' | 'level1' | 'level2' | 'starred';
type DictionarySort = 'learned' | 'alpha';

function filterAndSortDictionary(
  dictionary: readonly DictionaryEntry[],
  query: string,
  filter: DictionaryFilter,
  sort: DictionarySort,
): DictionaryEntry[] {
  let list = dictionary as DictionaryEntry[];

  if (filter === 'level1') list = list.filter((entry) => LEVEL_1_WORDS.has(entry.word));
  else if (filter === 'level2') list = list.filter((entry) => !LEVEL_1_WORDS.has(entry.word));
  else if (filter === 'starred') list = list.filter((entry) => entry.bookmarked);

  const trimmedQuery = query.trim().toLowerCase();
  if (trimmedQuery) {
    list = list.filter(
      (entry) =>
        entry.word.includes(query.trim()) ||
        (vocabEntryFor(entry.word)?.meaning ?? '').toLowerCase().includes(trimmedQuery),
    );
  }

  if (sort === 'alpha') {
    // Korean (Hangul) order (specs/ui-v2.md) — matches how a learner would
    // look words up in a Korean dictionary.
    list = [...list].sort((a, b) => a.word.localeCompare(b.word, 'ko'));
  }

  return list;
}

function tileClassName(tile: CoreTile, isClearing: boolean): string {
  const kindClass =
    tile.kind === 'stem'
      ? styles.stem
      : tile.kind === 'ending'
        ? styles.ending
        : tile.stage === 'present'
          ? styles.wordPresent
          : tile.stage === 'future'
            ? styles.wordFuture
            : styles.wordPast;
  return isClearing ? `${kindClass} ${styles.fading}` : kindClass;
}

function tileLabel(tile: CoreTile): string {
  if (tile.kind === 'stem') return tile.word;
  if (tile.kind === 'ending') {
    if (tile.tense === 'present') return '현재';
    if (tile.tense === 'future') return '미래';
    return '과거';
  }
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

function newSession(
  vocab: readonly VocabEntry[],
  mode: NormalOrHardMode,
  futureUnlocked: boolean,
): SessionState {
  const pool = createPool(vocab, POOL_SIZE);
  if (mode === 'hard') {
    const hardMode = createHardModeState(createEmptyBoard());
    const board = createInitialBoard(vocabForWords(pool.active), blockedSet(hardMode), futureUnlocked);
    return { board, score: 0, pool, hardMode };
  }
  const board = createInitialBoard(vocabForWords(pool.active), undefined, futureUnlocked);
  return { board, score: 0, pool };
}

export function Game({
  mode,
  onModeChange,
}: {
  mode: NormalOrHardMode;
  onModeChange: (mode: GameMode) => void;
}) {
  const [board, setBoard] = useState<Board>(() => createEmptyBoard());
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [pool, setPool] = useState<Pool>({ active: [], completed: [] });
  const [hardMode, setHardMode] = useState<HardModeState | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [clearingWords, setClearingWords] = useState<Set<string>>(new Set());
  const [dictionary, setDictionary] = useState<DictionaryEntry[]>([]);
  const [dictionaryOpen, setDictionaryOpen] = useState(false);
  const [dictionaryQuery, setDictionaryQuery] = useState('');
  const [dictionaryFilter, setDictionaryFilter] = useState<DictionaryFilter>('all');
  const [dictionarySort, setDictionarySort] = useState<DictionarySort>('learned');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [newWordToast, setNewWordToast] = useState<string[] | null>(null);
  const [level2Toast, setLevel2Toast] = useState(false);
  const [level3Toast, setLevel3Toast] = useState(false);
  const toastTimeoutRef = useRef<number | null>(null);

  // Refs mirror the latest committed state so the delayed fade-out/clear
  // timers (see scheduleCompletion below) always act on current data even
  // if more moves happen while a completion is still pending.
  const boardRef = useRef(board);
  const scoreRef = useRef(score);
  const poolRef = useRef(pool);
  const hardModeRef = useRef(hardMode);
  const isMountedRef = useRef(false);
  useEffect(() => {
    boardRef.current = board;
    scoreRef.current = score;
    poolRef.current = pool;
    hardModeRef.current = hardMode;
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
    const initialDictionary = loadDictionary();
    const saved = loadSession(mode);
    if (saved) {
      setBoard(saved.board);
      setScore(saved.score);
      setPool(saved.pool);
      setHardMode(saved.hardMode ?? null);
      setGameOver(isGameOver(saved.board, saved.hardMode ? blockedSet(saved.hardMode) : undefined));
    } else {
      const session = newSession(unlockedVocab(initialDictionary), mode, isFutureUnlocked(initialDictionary));
      setBoard(session.board);
      setPool(session.pool);
      setHardMode(session.hardMode ?? null);
      persistSession(mode, session);
    }
    setBestScore(loadBestScore(mode));
    setDictionary(initialDictionary);
    setHydrated(true);

    // First-ever visit (specs/ui-v2.md "Rules panel"): auto-open once so a
    // new player learns the objective and what 현재/과거/미래 mean without
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
  const scheduleCompletion = useCallback(
    (words: string[], vocab: readonly VocabEntry[], futureUnlocked: boolean) => {
      window.setTimeout(() => {
        if (!isMountedRef.current) return;
        setClearingWords((prev) => new Set([...prev, ...words]));

        window.setTimeout(() => {
          if (!isMountedRef.current) return;

          const { pool: nextPool, added } = advancePool(poolRef.current, words, vocab);
          let updatedBoard = clearCompletedTiles(boardRef.current, words);
          const blocked = hardModeRef.current ? blockedSet(hardModeRef.current) : new Set<string>();
          for (const word of added) {
            updatedBoard = spawnTile(updatedBoard, vocabForWords([word]), blocked, futureUnlocked);
          }

          setBoard(updatedBoard);
          setPool(nextPool);
          persistSession(mode, {
            board: updatedBoard,
            score: scoreRef.current,
            pool: nextPool,
            hardMode: hardModeRef.current ?? undefined,
          });
          setClearingWords((prev) => {
            const next = new Set(prev);
            words.forEach((w) => next.delete(w));
            return next;
          });
        }, FADE_DURATION_MS);
      }, FADE_HOLD_MS);
    },
    [mode],
  );

  const handleMove = useCallback(
    (direction: Direction) => {
      if (gameOver) return;
      const blocked = hardMode ? blockedSet(hardMode) : new Set<string>();
      const result = move(board, direction, blocked);
      if (!result.moved) return;

      // Relocate the dead zone (if due) using the post-move, pre-spawn
      // board, per hardmode.ts's advanceHardMode contract, then spawn into
      // the resulting (possibly-relocated) blocked set — so a new spawn
      // never lands on a cell that just became blocked this move.
      const nextHardMode = mode === 'hard' && hardMode ? advanceHardMode(hardMode, result.board) : null;
      const nextBlocked = nextHardMode ? blockedSet(nextHardMode) : new Set<string>();

      const reviewWord = pickReviewWord(
        dictionary.map((entry) => entry.word),
        pool.active,
        REVIEW_CHANCE,
      );
      const spawnWords = reviewWord ? [...pool.active, reviewWord] : pool.active;
      // Gated on the pre-move dictionary, same as unlockedVocab/pool.active
      // above — this move's spawns reflect what was already unlocked
      // going in, not what this move's own completions might just unlock.
      const futureUnlocked = isFutureUnlocked(dictionary);
      let nextBoard = spawnTile(result.board, vocabForWords(spawnWords), nextBlocked, futureUnlocked);
      if (mode === 'hard') {
        // Hard mode's board pressure: two tiles spawn per move instead of one.
        nextBoard = spawnTile(nextBoard, vocabForWords(spawnWords), nextBlocked, futureUnlocked);
      }
      const dictUpdate = updateDictionary(dictionary, result.completedWords);
      const nextScore = score + result.scoreDelta + dictUpdate.bonus;
      const justUnlockedLevel2 =
        !isLevel1Complete(dictionary) && isLevel1Complete(dictUpdate.dictionary);
      const justUnlockedLevel3 =
        !isFutureUnlocked(dictionary) && isFutureUnlocked(dictUpdate.dictionary);

      setBoard(nextBoard);
      setScore(nextScore);
      setHardMode(nextHardMode);
      persistSession(mode, {
        board: nextBoard,
        score: nextScore,
        pool,
        hardMode: nextHardMode ?? undefined,
      });

      if (result.completedWords.length > 0) {
        setDictionary(dictUpdate.dictionary);
        persistDictionary(dictUpdate.dictionary);
      }

      if (justUnlockedLevel2) {
        setLevel2Toast(true);
        if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = window.setTimeout(() => {
          setLevel2Toast(false);
        }, TOAST_DURATION_MS);
      } else if (justUnlockedLevel3) {
        setLevel3Toast(true);
        if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = window.setTimeout(() => {
          setLevel3Toast(false);
        }, TOAST_DURATION_MS);
      } else if (dictUpdate.newWords.length > 0) {
        setNewWordToast(dictUpdate.newWords);
        if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
        toastTimeoutRef.current = window.setTimeout(() => {
          setNewWordToast(null);
        }, TOAST_DURATION_MS);
      }

      if (nextScore > bestScore) {
        setBestScore(nextScore);
        persistBestScore(mode, nextScore);
      }

      if (isGameOver(nextBoard, nextBlocked)) {
        setGameOver(true);
      }

      if (result.completedWords.length > 0) {
        scheduleCompletion(
          result.completedWords,
          unlockedVocab(dictUpdate.dictionary),
          isFutureUnlocked(dictUpdate.dictionary),
        );
      }
    },
    [board, score, bestScore, gameOver, pool, dictionary, hardMode, mode, scheduleCompletion],
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
    const session = newSession(unlockedVocab(dictionary), mode, isFutureUnlocked(dictionary));
    setBoard(session.board);
    setScore(0);
    setPool(session.pool);
    setHardMode(session.hardMode ?? null);
    setGameOver(false);
    setClearingWords(new Set());
    persistSession(mode, session);
  }

  function handleToggleBookmark(word: string) {
    const next = toggleBookmark(dictionary, word);
    setDictionary(next);
    persistDictionary(next);
  }

  const visibleDictionary = useMemo(
    () => filterAndSortDictionary(dictionary, dictionaryQuery, dictionaryFilter, dictionarySort),
    [dictionary, dictionaryQuery, dictionaryFilter, dictionarySort],
  );

  const tiles = hydrated ? flattenBoard(board) : [];
  const blockedCells = hardMode ? new Set(hardMode.blockedCells) : null;

  return (
    <main className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>2048 Hangul Conjugation</h1>
        <ThemeToggle />
      </div>

      <ModeSwitcher mode={mode} onChange={onModeChange} />

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

      {level2Toast && (
        <div className={styles.toast} role="status">
          <div className={styles.toastLine}>
            <strong>Level 2 unlocked!</strong> Irregular-conjugation words will now show up.
          </div>
        </div>
      )}

      {level3Toast && (
        <div className={styles.toast} role="status">
          <div className={styles.toastLine}>
            <strong>Level 3 unlocked!</strong> Future-tense endings will now show up.
          </div>
        </div>
      )}

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
          {Array.from({ length: BOARD_SIZE * BOARD_SIZE }).map((_, i) => {
            const row = Math.floor(i / BOARD_SIZE);
            const col = i % BOARD_SIZE;
            const isBlocked = blockedCells?.has(positionKey(row, col)) ?? false;
            return (
              <div
                key={i}
                className={isBlocked ? `${styles.emptyCell} ${styles.blockedCell}` : styles.emptyCell}
                aria-hidden={isBlocked}
              />
            );
          })}
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
              <strong>ending</strong> tile into a conjugated <strong>word</strong> tile. A
              present-tense word can merge again with a past ending to become past tense — or a
              stem can merge directly with a future ending instead, skipping present entirely. No
              legal merge left anywhere on the board ends the game.
            </p>
            <ul className={styles.rulesList}>
              <li>
                <strong>현재</strong> — present tense
              </li>
              <li>
                <strong>과거</strong> — past tense
              </li>
              <li>
                <strong>미래</strong> — future tense (merges directly from a stem, once unlocked)
              </li>
            </ul>
            <p>
              Reaching past <strong>or</strong> future tense on a word for the first time adds it
              to your <strong>Dictionary</strong> and scores a one-time bonus. Future-tense
              endings unlock once every word you know has been fully conjugated at least once.
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

              {dictionary.length > 0 && (
                <div className={styles.dictionaryControls}>
                  <input
                    type="text"
                    className={styles.dictionarySearch}
                    placeholder="Search word or meaning"
                    value={dictionaryQuery}
                    onChange={(event) => setDictionaryQuery(event.target.value)}
                    aria-label="Search dictionary"
                    tabIndex={dictionaryOpen ? 0 : -1}
                  />
                  <div className={styles.dictionaryFilters} role="tablist" aria-label="Filter dictionary">
                    {(
                      [
                        ['all', 'All'],
                        ['level1', 'Level 1'],
                        ['level2', 'Level 2'],
                        ['starred', '★ Starred'],
                      ] as Array<[DictionaryFilter, string]>
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={dictionaryFilter === value}
                        className={`${styles.dictionaryFilterButton} ${
                          dictionaryFilter === value ? styles.dictionaryFilterButtonActive : ''
                        }`}
                        onClick={() => setDictionaryFilter(value)}
                        tabIndex={dictionaryOpen ? 0 : -1}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <label className={styles.dictionarySortLabel}>
                    Sort
                    <select
                      className={styles.dictionarySortSelect}
                      value={dictionarySort}
                      onChange={(event) => setDictionarySort(event.target.value as DictionarySort)}
                      tabIndex={dictionaryOpen ? 0 : -1}
                    >
                      <option value="learned">Order learned</option>
                      <option value="alpha">A → Z</option>
                    </select>
                  </label>
                </div>
              )}

              <div className={styles.dictionaryListWrap}>
                {dictionary.length === 0 ? (
                  <p className={styles.dictionaryEmpty}>
                    No words learned yet — conjugate one to its past or future form to add it here.
                  </p>
                ) : visibleDictionary.length === 0 ? (
                  <p className={styles.dictionaryEmpty}>No words match.</p>
                ) : (
                  <ul className={styles.dictionaryList}>
                    {visibleDictionary.map(({ word, count, bookmarked }) => {
                      const entry = vocabEntryFor(word);
                      return (
                        <li key={word} className={styles.dictionaryRow}>
                          <div className={styles.dictionaryRowTop}>
                            <button
                              type="button"
                              className={styles.bookmarkButton}
                              onClick={() => handleToggleBookmark(word)}
                              aria-label={bookmarked ? `Unstar ${word}` : `Star ${word}`}
                              aria-pressed={bookmarked}
                              tabIndex={dictionaryOpen ? 0 : -1}
                            >
                              {bookmarked ? '★' : '☆'}
                            </button>
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
                            <span className={styles.dictionaryMastery} title="Times fully conjugated (past or future)">
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
