import { conjugate } from './conjugate';
import type { Board, Cell, ConjugationStage, Direction, EndingTile, StemTile, Tile, WordTile } from './types';
import type { VocabEntry } from './vocab';

export const BOARD_SIZE = 4;

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `tile-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_SIZE }, () => Array<Cell>(BOARD_SIZE).fill(null));
}

function makeWordTile(word: string, stage: ConjugationStage): WordTile {
  return {
    kind: 'word',
    id: generateId(),
    word,
    stage,
    surfaceForm: conjugate(word, stage),
  };
}

function asStemEndingPair(a: Tile, b: Tile): [StemTile, EndingTile] | null {
  if (a.kind === 'stem' && b.kind === 'ending') return [a, b];
  if (b.kind === 'stem' && a.kind === 'ending') return [b, a];
  return null;
}

function asWordEndingPair(a: Tile, b: Tile): [WordTile, EndingTile] | null {
  if (a.kind === 'word' && b.kind === 'ending') return [a, b];
  if (b.kind === 'word' && a.kind === 'ending') return [b, a];
  return null;
}

export interface MergeOutcome {
  tile: Tile;
  scoreDelta: number;
  /** Set when this merge is a word reaching its past (final v1) stage. */
  completedWord?: string;
}

/**
 * Merge compatibility per constitution.md Section 3: a stem only merges
 * with a present-tense ending (→ present-stage word tile, +10); a
 * present-stage word only merges with a past-tense ending (→ past-stage
 * word tile, +20, and that word "completes"). Every other pairing
 * (stem+stem, ending+ending, word+word, stem+past-ending,
 * present-word+present-ending, past-stage word+anything) does not merge.
 */
export function attemptMerge(a: Tile, b: Tile): MergeOutcome | null {
  const stemEnding = asStemEndingPair(a, b);
  if (stemEnding) {
    const [stem, ending] = stemEnding;
    if (ending.tense === 'present') {
      return { tile: makeWordTile(stem.word, 'present'), scoreDelta: 10 };
    }
    return null;
  }

  const wordEnding = asWordEndingPair(a, b);
  if (wordEnding) {
    const [word, ending] = wordEnding;
    if (word.stage === 'present' && ending.tense === 'past') {
      return {
        tile: makeWordTile(word.word, 'past'),
        scoreDelta: 20,
        completedWord: word.word,
      };
    }
    return null;
  }

  return null;
}

interface LineMergeResult {
  tiles: Tile[];
  scoreDelta: number;
  completedWords: string[];
}

/** tiles must already be gap-compacted, ordered front-to-back. */
function mergeLine(tiles: Tile[]): LineMergeResult {
  const result: Tile[] = [];
  let scoreDelta = 0;
  const completedWords: string[] = [];

  let i = 0;
  while (i < tiles.length) {
    const current = tiles[i];
    const next = tiles[i + 1];
    const outcome = next ? attemptMerge(current, next) : null;
    if (outcome) {
      result.push(outcome.tile);
      scoreDelta += outcome.scoreDelta;
      if (outcome.completedWord) completedWords.push(outcome.completedWord);
      i += 2;
    } else {
      result.push(current);
      i += 1;
    }
  }

  return { tiles: result, scoreDelta, completedWords };
}

function getLine(board: Board, direction: Direction, index: number): Cell[] {
  if (direction === 'left') return board[index].slice();
  if (direction === 'right') return board[index].slice().reverse();
  if (direction === 'up') return board.map((row) => row[index]);
  return board.map((row) => row[index]).reverse();
}

function setLine(board: Board, direction: Direction, index: number, line: Cell[]): void {
  if (direction === 'left') {
    board[index] = line;
  } else if (direction === 'right') {
    board[index] = line.slice().reverse();
  } else if (direction === 'up') {
    line.forEach((cell, row) => {
      board[row][index] = cell;
    });
  } else {
    line
      .slice()
      .reverse()
      .forEach((cell, row) => {
        board[row][index] = cell;
      });
  }
}

function cellsEqual(a: Cell, b: Cell): boolean {
  if (a === null || b === null) return a === b;
  return a.id === b.id;
}

export interface MoveResult {
  board: Board;
  scoreDelta: number;
  completedWords: string[];
  moved: boolean;
}

export function move(board: Board, direction: Direction): MoveResult {
  const newBoard: Board = board.map((row) => row.slice());
  let totalScoreDelta = 0;
  const allCompletedWords: string[] = [];
  let moved = false;

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    const line = getLine(newBoard, direction, index);
    const nonNullTiles = line.filter((cell): cell is Tile => cell !== null);
    const { tiles: mergedTiles, scoreDelta, completedWords } = mergeLine(nonNullTiles);
    totalScoreDelta += scoreDelta;
    allCompletedWords.push(...completedWords);

    const paddedLine: Cell[] = [
      ...mergedTiles,
      ...Array<Cell>(BOARD_SIZE - mergedTiles.length).fill(null),
    ];

    if (!line.every((cell, i) => cellsEqual(cell, paddedLine[i]))) {
      moved = true;
    }
    setLine(newBoard, direction, index, paddedLine);
  }

  return { board: newBoard, scoreDelta: totalScoreDelta, completedWords: allCompletedWords, moved };
}

function createSpawnTile(vocab: readonly VocabEntry[]): Tile {
  // First-pass spawn weighting (constitution.md Section 3.2, marked OPEN
  // there for build-time tuning): 50/50 stem vs. ending, and endings lean
  // present (70/30) since a past ending is only useful once a
  // present-stage word tile already exists on the board.
  if (Math.random() < 0.5) {
    const entry = vocab[Math.floor(Math.random() * vocab.length)];
    return { kind: 'stem', id: generateId(), word: entry.word };
  }
  const tense: ConjugationStage = Math.random() < 0.7 ? 'present' : 'past';
  return { kind: 'ending', id: generateId(), tense };
}

export function spawnTile(board: Board, vocab: readonly VocabEntry[]): Board {
  const emptyCells: Array<[number, number]> = [];
  board.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === null) emptyCells.push([r, c]);
    });
  });
  if (emptyCells.length === 0) return board;

  const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const newBoard = board.map((r) => r.slice());
  newBoard[row][col] = createSpawnTile(vocab);
  return newBoard;
}

export function createInitialBoard(vocab: readonly VocabEntry[]): Board {
  let board = createEmptyBoard();
  board = spawnTile(board, vocab);
  board = spawnTile(board, vocab);
  return board;
}

/**
 * Removes every tile belonging to any of the given (now-retired) words —
 * stem or word-stage tiles, including stray duplicates — freeing their
 * cells. Used when the active pool (see pool.ts) retires a completed
 * word, so no dead tiles of it linger on the board.
 */
export function clearCompletedTiles(board: Board, completedWords: readonly string[]): Board {
  if (completedWords.length === 0) return board;
  const words = new Set(completedWords);
  return board.map((row) =>
    row.map((cell) => {
      if (cell && cell.kind !== 'ending' && words.has(cell.word)) {
        return null;
      }
      return cell;
    }),
  );
}

/** No empty cell remains, and no adjacent pair anywhere can merge. */
export function isGameOver(board: Board): boolean {
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      const cell = board[r][c];
      if (cell === null) return false;

      const right = c + 1 < BOARD_SIZE ? board[r][c + 1] : null;
      if (right && attemptMerge(cell, right)) return false;

      const down = r + 1 < BOARD_SIZE ? board[r + 1][c] : null;
      if (down && attemptMerge(cell, down)) return false;
    }
  }
  return true;
}
