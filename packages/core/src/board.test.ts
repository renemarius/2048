import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE,
  attemptMerge,
  createEmptyBoard,
  createInitialBoard,
  isGameOver,
  move,
  spawnTile,
} from './board';
import type { Board, EndingTile, StemTile, Tile, WordTile } from './types';
import { VOCAB } from './vocab';

let testIdCounter = 0;
function nextId(): string {
  testIdCounter += 1;
  return `test-${testIdCounter}`;
}

function stemTile(word: string): StemTile {
  return { kind: 'stem', id: nextId(), word };
}

function endingTile(tense: 'present' | 'past'): EndingTile {
  return { kind: 'ending', id: nextId(), tense };
}

function wordTile(word: string, stage: 'present' | 'past', surfaceForm: string): WordTile {
  return { kind: 'word', id: nextId(), word, stage, surfaceForm };
}

function emptyBoardWith(placements: Array<[row: number, col: number, tile: Tile]>): Board {
  const board = createEmptyBoard();
  for (const [row, col, tile] of placements) {
    board[row][col] = tile;
  }
  return board;
}

describe('createEmptyBoard', () => {
  it('creates a 4x4 grid of nulls', () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(BOARD_SIZE);
    for (const row of board) {
      expect(row).toHaveLength(BOARD_SIZE);
      expect(row.every((cell) => cell === null)).toBe(true);
    }
  });
});

describe('attemptMerge', () => {
  it('merges a stem with a present ending into a present-stage word tile', () => {
    const outcome = attemptMerge(stemTile('먹다'), endingTile('present'));
    expect(outcome).not.toBeNull();
    expect(outcome?.tile).toMatchObject({ kind: 'word', word: '먹다', stage: 'present', surfaceForm: '먹어요' });
    expect(outcome?.scoreDelta).toBe(10);
    expect(outcome?.completedWord).toBeUndefined();
  });

  it('is order-independent for stem + present ending', () => {
    const outcome = attemptMerge(endingTile('present'), stemTile('가다'));
    expect(outcome?.tile).toMatchObject({ kind: 'word', word: '가다', stage: 'present', surfaceForm: '가요' });
  });

  it('merges a present-stage word with a past ending into a past-stage word tile', () => {
    const outcome = attemptMerge(wordTile('먹다', 'present', '먹어요'), endingTile('past'));
    expect(outcome?.tile).toMatchObject({ kind: 'word', word: '먹다', stage: 'past', surfaceForm: '먹었어요' });
    expect(outcome?.scoreDelta).toBe(20);
    expect(outcome?.completedWord).toBe('먹다');
  });

  it('does not merge a stem with a past ending', () => {
    expect(attemptMerge(stemTile('먹다'), endingTile('past'))).toBeNull();
  });

  it('does not merge a present-stage word with a present ending', () => {
    expect(attemptMerge(wordTile('먹다', 'present', '먹어요'), endingTile('present'))).toBeNull();
  });

  it('does not merge a past-stage word with anything', () => {
    expect(attemptMerge(wordTile('먹다', 'past', '먹었어요'), endingTile('present'))).toBeNull();
    expect(attemptMerge(wordTile('먹다', 'past', '먹었어요'), endingTile('past'))).toBeNull();
  });

  it('does not merge two tiles of the same kind', () => {
    expect(attemptMerge(stemTile('먹다'), stemTile('가다'))).toBeNull();
    expect(attemptMerge(endingTile('present'), endingTile('present'))).toBeNull();
    expect(attemptMerge(wordTile('먹다', 'present', '먹어요'), wordTile('가다', 'present', '가요'))).toBeNull();
  });
});

describe('move', () => {
  it('merges two already-adjacent compatible tiles', () => {
    const board = emptyBoardWith([
      [0, 0, stemTile('먹다')],
      [0, 1, endingTile('present')],
    ]);
    const result = move(board, 'left');
    expect(result.moved).toBe(true);
    expect(result.scoreDelta).toBe(10);
    expect(result.completedWords).toEqual([]);
    expect(result.board[0][0]).toMatchObject({ kind: 'word', word: '먹다', stage: 'present' });
    expect(result.board[0][1]).toBeNull();
  });

  it('slides tiles together across a gap before merging', () => {
    const board = emptyBoardWith([
      [0, 0, stemTile('먹다')],
      [0, 3, endingTile('present')],
    ]);
    const result = move(board, 'left');
    expect(result.scoreDelta).toBe(10);
    expect(result.board[0][0]).toMatchObject({ kind: 'word', word: '먹다', stage: 'present' });
    expect(result.board[0][1]).toBeNull();
    expect(result.board[0][2]).toBeNull();
    expect(result.board[0][3]).toBeNull();
  });

  it('slides without merging when tiles are incompatible', () => {
    const board = emptyBoardWith([
      [0, 0, stemTile('먹다')],
      [0, 2, stemTile('가다')],
    ]);
    const result = move(board, 'left');
    expect(result.moved).toBe(true);
    expect(result.scoreDelta).toBe(0);
    expect(result.board[0][0]).toMatchObject({ kind: 'stem', word: '먹다' });
    expect(result.board[0][1]).toMatchObject({ kind: 'stem', word: '가다' });
    expect(result.board[0][2]).toBeNull();
  });

  it('reports moved: false and leaves the board untouched when nothing changes', () => {
    const board = emptyBoardWith([
      [0, 0, stemTile('먹다')],
      [0, 1, stemTile('가다')],
    ]);
    const result = move(board, 'left');
    expect(result.moved).toBe(false);
    expect(result.scoreDelta).toBe(0);
    expect(result.board[0][0]).toBe(board[0][0]);
    expect(result.board[0][1]).toBe(board[0][1]);
  });

  it('produces a past-stage word tile and reports the completed word', () => {
    const board = emptyBoardWith([
      [0, 0, wordTile('먹다', 'present', '먹어요')],
      [0, 1, endingTile('past')],
    ]);
    const result = move(board, 'left');
    expect(result.scoreDelta).toBe(20);
    expect(result.completedWords).toEqual(['먹다']);
    expect(result.board[0][0]).toMatchObject({ kind: 'word', word: '먹다', stage: 'past', surfaceForm: '먹었어요' });
  });

  it('moves and merges correctly in every direction', () => {
    const right = move(
      emptyBoardWith([
        [0, 0, stemTile('먹다')],
        [0, 1, endingTile('present')],
      ]),
      'right',
    );
    expect(right.board[0][3]).toMatchObject({ kind: 'word', word: '먹다', stage: 'present' });

    const up = move(
      emptyBoardWith([
        [2, 0, stemTile('먹다')],
        [3, 0, endingTile('present')],
      ]),
      'up',
    );
    expect(up.board[0][0]).toMatchObject({ kind: 'word', word: '먹다', stage: 'present' });

    const down = move(
      emptyBoardWith([
        [0, 0, stemTile('먹다')],
        [1, 0, endingTile('present')],
      ]),
      'down',
    );
    expect(down.board[3][0]).toMatchObject({ kind: 'word', word: '먹다', stage: 'present' });
  });
});

describe('spawnTile', () => {
  it('places exactly one new tile on an empty board', () => {
    const board = createEmptyBoard();
    const result = spawnTile(board, VOCAB);
    const nonNullCells = result.flat().filter((cell) => cell !== null);
    expect(nonNullCells).toHaveLength(1);
  });

  it('spawns a stem tile whose word comes from the given vocab pool', () => {
    // Force stem spawning to be observable by checking across many trials
    // that every stem word seen is a real vocab word (endings have no word
    // to check, so this only asserts on the stem branch when it occurs).
    const vocabWords = new Set(VOCAB.map((entry) => entry.word));
    for (let trial = 0; trial < 50; trial += 1) {
      const result = spawnTile(createEmptyBoard(), VOCAB);
      const tile = result.flat().find((cell) => cell !== null);
      if (tile?.kind === 'stem') {
        expect(vocabWords.has(tile.word)).toBe(true);
      }
    }
  });

  it('returns the board unchanged when there is no empty cell', () => {
    const full = createEmptyBoard();
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        full[r][c] = endingTile('present');
      }
    }
    expect(spawnTile(full, VOCAB)).toBe(full);
  });
});

describe('createInitialBoard', () => {
  it('starts with exactly two tiles', () => {
    const board = createInitialBoard(VOCAB);
    const nonNullCells = board.flat().filter((cell) => cell !== null);
    expect(nonNullCells).toHaveLength(2);
  });
});

describe('isGameOver', () => {
  it('is false when any empty cell remains', () => {
    expect(isGameOver(createEmptyBoard())).toBe(false);
  });

  it('is true on a full board with no possible merges anywhere', () => {
    const board = createEmptyBoard();
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        board[r][c] = endingTile('present');
      }
    }
    expect(isGameOver(board)).toBe(true);
  });

  it('is false on a full board with at least one possible merge', () => {
    const board = createEmptyBoard();
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        board[r][c] = endingTile('past');
      }
    }
    board[0][0] = stemTile('가다');
    board[0][1] = endingTile('present');
    expect(isGameOver(board)).toBe(false);
  });
});
