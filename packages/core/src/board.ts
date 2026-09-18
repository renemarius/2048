import { conjugate } from './conjugate';
import type { Board, Cell, ConjugationStage, Direction, EndingTile, StemTile, Tile, WordTile } from './types';
import type { VocabEntry } from './vocab';

export const BOARD_SIZE = 4;

let idCounter = 0;
function generateId(): string {
  idCounter += 1;
  return `tile-${idCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Cell coordinates as `"row,col"`, used to key blocked-cell sets (Hard mode). */
export function positionKey(row: number, col: number): string {
  return `${row},${col}`;
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

/** Board coordinates for each slot of `getLine(direction, index)`, in the same order. */
function lineCoordinates(direction: Direction, index: number): Array<[number, number]> {
  if (direction === 'left') return Array.from({ length: BOARD_SIZE }, (_, c) => [index, c]);
  if (direction === 'right')
    return Array.from({ length: BOARD_SIZE }, (_, c) => [index, BOARD_SIZE - 1 - c]);
  if (direction === 'up') return Array.from({ length: BOARD_SIZE }, (_, r) => [r, index]);
  return Array.from({ length: BOARD_SIZE }, (_, r) => [BOARD_SIZE - 1 - r, index]);
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

/**
 * Hard mode's dead-zone cells (specs/game-modes-v2.md) act as fixed walls:
 * tiles slide up to them but never onto or through them, and they never
 * merge. Blocked slots keep their original (always-null, per the
 * blocked-cell-picking invariant in hardmode.ts) content untouched rather
 * than being forced null here, so a stray tile is never silently dropped
 * if that invariant is ever violated.
 */
function mergeLineWithBlocks(
  line: Cell[],
  blockedFlags: readonly boolean[],
): { line: Cell[]; scoreDelta: number; completedWords: string[] } {
  const resultLine: Cell[] = new Array(line.length).fill(null);
  let scoreDelta = 0;
  const completedWords: string[] = [];

  let segmentStart = 0;
  for (let i = 0; i <= line.length; i += 1) {
    if (i < line.length && !blockedFlags[i]) continue;

    const segmentTiles = line.slice(segmentStart, i).filter((cell): cell is Tile => cell !== null);
    const merged = mergeLine(segmentTiles);
    scoreDelta += merged.scoreDelta;
    completedWords.push(...merged.completedWords);
    merged.tiles.forEach((tile, offset) => {
      resultLine[segmentStart + offset] = tile;
    });

    if (i < line.length) resultLine[i] = line[i];
    segmentStart = i + 1;
  }

  return { line: resultLine, scoreDelta, completedWords };
}

export interface MoveResult {
  board: Board;
  scoreDelta: number;
  completedWords: string[];
  moved: boolean;
}

/**
 * `blocked` (Hard mode's relocating dead zone, specs/game-modes-v2.md) is a
 * set of `positionKey` strings that tiles can never slide onto or merge
 * across; defaults to empty for Normal mode.
 */
export function move(
  board: Board,
  direction: Direction,
  blocked: ReadonlySet<string> = new Set(),
): MoveResult {
  const newBoard: Board = board.map((row) => row.slice());
  let totalScoreDelta = 0;
  const allCompletedWords: string[] = [];
  let moved = false;

  for (let index = 0; index < BOARD_SIZE; index += 1) {
    const line = getLine(newBoard, direction, index);
    const coords = lineCoordinates(direction, index);
    const blockedFlags = coords.map(([r, c]) => blocked.has(positionKey(r, c)));
    const { line: mergedLine, scoreDelta, completedWords } = mergeLineWithBlocks(line, blockedFlags);
    totalScoreDelta += scoreDelta;
    allCompletedWords.push(...completedWords);

    if (!line.every((cell, i) => cellsEqual(cell, mergedLine[i]))) {
      moved = true;
    }
    setLine(newBoard, direction, index, mergedLine);
  }

  return { board: newBoard, scoreDelta: totalScoreDelta, completedWords: allCompletedWords, moved };
}

interface BoardNeeds {
  /** Pool words with no live tile (stem or word, any stage) on the board. */
  missingPoolWords: string[];
  /** How many more present endings would actually find a use right now. */
  presentEndingDeficit: number;
  /** How many more past endings would actually find a use right now. */
  pastEndingDeficit: number;
}

/**
 * What the board actually needs next, given the words currently in play.
 * A stem is "needed" only for a pool word that has no tile on the board
 * yet (prevents spawning a second stem for a word already in progress,
 * which used to pile up duplicates like a stray 가다 sitting next to its
 * own 가요). An ending is "needed" only up to how many tiles could
 * actually use one right now (deficit = demand - supply, floored at 0),
 * so endings stop accumulating once there's nothing left for them to
 * merge with.
 */
function analyzeBoardNeeds(board: Board, poolWords: readonly string[]): BoardNeeds {
  let stemCount = 0;
  let presentWordCount = 0;
  let presentEndingCount = 0;
  let pastEndingCount = 0;
  const wordsOnBoard = new Set<string>();

  for (const row of board) {
    for (const cell of row) {
      if (!cell) continue;
      if (cell.kind === 'stem') {
        stemCount += 1;
        wordsOnBoard.add(cell.word);
      } else if (cell.kind === 'word') {
        wordsOnBoard.add(cell.word);
        if (cell.stage === 'present') presentWordCount += 1;
      } else if (cell.tense === 'present') {
        presentEndingCount += 1;
      } else {
        pastEndingCount += 1;
      }
    }
  }

  return {
    missingPoolWords: poolWords.filter((word) => !wordsOnBoard.has(word)),
    presentEndingDeficit: Math.max(0, stemCount - presentEndingCount),
    pastEndingDeficit: Math.max(0, presentWordCount - pastEndingCount),
  };
}

function createSpawnTile(board: Board, vocab: readonly VocabEntry[]): Tile {
  const poolWords = vocab.map((entry) => entry.word);
  const needs = analyzeBoardNeeds(board, poolWords);

  const candidates: Array<() => Tile> = [];
  if (needs.missingPoolWords.length > 0) {
    candidates.push(() => {
      const word = needs.missingPoolWords[Math.floor(Math.random() * needs.missingPoolWords.length)];
      return { kind: 'stem', id: generateId(), word };
    });
  }
  if (needs.presentEndingDeficit > 0) {
    candidates.push(() => ({ kind: 'ending', id: generateId(), tense: 'present' }));
  }
  if (needs.pastEndingDeficit > 0) {
    candidates.push(() => ({ kind: 'ending', id: generateId(), tense: 'past' }));
  }

  if (candidates.length === 0) {
    // Board already has everything it currently needs (rare, and
    // self-correcting once the next move changes the board) — fall back
    // to a generic weighted spawn so the game never stalls with an empty
    // cell and nothing to put in it.
    if (vocab.length > 0 && Math.random() < 0.5) {
      const entry = vocab[Math.floor(Math.random() * vocab.length)];
      return { kind: 'stem', id: generateId(), word: entry.word };
    }
    const tense: ConjugationStage = Math.random() < 0.7 ? 'present' : 'past';
    return { kind: 'ending', id: generateId(), tense };
  }

  const chosen = candidates[Math.floor(Math.random() * candidates.length)];
  return chosen();
}

export function spawnTile(
  board: Board,
  vocab: readonly VocabEntry[],
  blocked: ReadonlySet<string> = new Set(),
): Board {
  const emptyCells: Array<[number, number]> = [];
  board.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === null && !blocked.has(positionKey(r, c))) emptyCells.push([r, c]);
    });
  });
  if (emptyCells.length === 0) return board;

  const [row, col] = emptyCells[Math.floor(Math.random() * emptyCells.length)];
  const newBoard = board.map((r) => r.slice());
  newBoard[row][col] = createSpawnTile(board, vocab);
  return newBoard;
}

export function createInitialBoard(
  vocab: readonly VocabEntry[],
  blocked: ReadonlySet<string> = new Set(),
): Board {
  let board = createEmptyBoard();
  board = spawnTile(board, vocab, blocked);
  board = spawnTile(board, vocab, blocked);
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

/**
 * No empty (non-blocked) cell remains, and no adjacent pair anywhere can
 * merge. Blocked cells (Hard mode) are excluded from both checks — they're
 * not playable space, and a wall never counts as a merge partner.
 */
export function isGameOver(board: Board, blocked: ReadonlySet<string> = new Set()): boolean {
  for (let r = 0; r < BOARD_SIZE; r += 1) {
    for (let c = 0; c < BOARD_SIZE; c += 1) {
      if (blocked.has(positionKey(r, c))) continue;
      const cell = board[r][c];
      if (cell === null) return false;

      const right = c + 1 < BOARD_SIZE && !blocked.has(positionKey(r, c + 1)) ? board[r][c + 1] : null;
      if (right && attemptMerge(cell, right)) return false;

      const down = r + 1 < BOARD_SIZE && !blocked.has(positionKey(r + 1, c)) ? board[r + 1][c] : null;
      if (down && attemptMerge(cell, down)) return false;
    }
  }
  return true;
}
