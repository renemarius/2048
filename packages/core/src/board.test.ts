import { describe, expect, it } from 'vitest';
import {
  BOARD_SIZE,
  attemptMerge,
  clearCompletedTiles,
  createEmptyBoard,
  createInitialBoard,
  isGameOver,
  move,
  positionKey,
  spawnTile,
} from './board';
import type { Board, Direction, EndingTile, StemTile, Tile, WordTile } from './types';
import { VOCAB } from './vocab';

let testIdCounter = 0;
function nextId(): string {
  testIdCounter += 1;
  return `test-${testIdCounter}`;
}

function stemTile(word: string): StemTile {
  return { kind: 'stem', id: nextId(), word };
}

function endingTile(tense: 'present' | 'past' | 'future'): EndingTile {
  return { kind: 'ending', id: nextId(), tense };
}

function wordTile(word: string, stage: 'present' | 'past' | 'future', surfaceForm: string): WordTile {
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

  // Level 3 (specs/tenses-v2.md): future is a parallel branch off the
  // stem, not a third link chained after past — it merges directly from
  // a stem tile, retires the word in one merge (+30), and a present-stage
  // word never accepts a future ending.
  describe('future tense (specs/tenses-v2.md)', () => {
    it('merges a stem with a future ending directly into a future-stage word tile', () => {
      const outcome = attemptMerge(stemTile('먹다'), endingTile('future'));
      expect(outcome).not.toBeNull();
      expect(outcome?.tile).toMatchObject({
        kind: 'word',
        word: '먹다',
        stage: 'future',
        surfaceForm: '먹을 거예요',
      });
      expect(outcome?.scoreDelta).toBe(30);
      expect(outcome?.completedWord).toBe('먹다');
    });

    it('is order-independent for stem + future ending', () => {
      const outcome = attemptMerge(endingTile('future'), stemTile('가다'));
      expect(outcome?.tile).toMatchObject({ kind: 'word', word: '가다', stage: 'future', surfaceForm: '갈 거예요' });
    });

    it('does not merge a present-stage word with a future ending', () => {
      expect(attemptMerge(wordTile('먹다', 'present', '먹어요'), endingTile('future'))).toBeNull();
    });

    it('does not merge a future-stage word with anything', () => {
      expect(attemptMerge(wordTile('먹다', 'future', '먹을 거예요'), endingTile('present'))).toBeNull();
      expect(attemptMerge(wordTile('먹다', 'future', '먹을 거예요'), endingTile('past'))).toBeNull();
      expect(attemptMerge(wordTile('먹다', 'future', '먹을 거예요'), endingTile('future'))).toBeNull();
    });
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

describe('move with blocked cells (Hard mode dead zone)', () => {
  it('stops a tile at a blocked cell instead of sliding past it', () => {
    const board = emptyBoardWith([[0, 3, stemTile('먹다')]]);
    const blocked = new Set([positionKey(0, 1)]);
    const result = move(board, 'left', blocked);
    // Blocked at col 1, so the tile can only slide down to col 2, not col 0.
    expect(result.board[0][2]).toMatchObject({ kind: 'stem', word: '먹다' });
    expect(result.board[0][0]).toBeNull();
    expect(result.board[0][1]).toBeNull();
    expect(result.moved).toBe(true);
  });

  it('does not merge two compatible tiles across a blocked cell', () => {
    const board = emptyBoardWith([
      [0, 0, stemTile('먹다')],
      [0, 3, endingTile('present')],
    ]);
    const blocked = new Set([positionKey(0, 1)]);
    const result = move(board, 'left', blocked);
    expect(result.scoreDelta).toBe(0);
    expect(result.board[0][0]).toMatchObject({ kind: 'stem', word: '먹다' });
    expect(result.board[0][2]).toMatchObject({ kind: 'ending', tense: 'present' });
    expect(result.board[0][1]).toBeNull();
  });

  it('still merges normally within a single segment on either side of a blocked cell', () => {
    const board = emptyBoardWith([
      [0, 2, stemTile('먹다')],
      [0, 3, endingTile('present')],
    ]);
    const blocked = new Set([positionKey(0, 1)]);
    const result = move(board, 'left', blocked);
    expect(result.scoreDelta).toBe(10);
    expect(result.board[0][2]).toMatchObject({ kind: 'word', word: '먹다', stage: 'present' });
  });

  it('leaves a blocked cell empty and unaffected by the move', () => {
    const board = emptyBoardWith([[0, 0, stemTile('먹다')]]);
    const blocked = new Set([positionKey(0, 1)]);
    const result = move(board, 'right', blocked);
    expect(result.board[0][1]).toBeNull();
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

  it('never spawns into a blocked cell', () => {
    // Block every cell except (0,0) so any successful spawn must land there.
    const blocked = new Set<string>();
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        if (r !== 0 || c !== 0) blocked.add(positionKey(r, c));
      }
    }
    for (let trial = 0; trial < 20; trial += 1) {
      const result = spawnTile(createEmptyBoard(), VOCAB, blocked);
      const nonNullCells = result.flat().filter((cell) => cell !== null);
      expect(nonNullCells).toHaveLength(1);
      expect(result[0][0]).not.toBeNull();
    }
  });

  it('returns the board unchanged when every non-blocked cell is full', () => {
    const board = createEmptyBoard();
    const blocked = new Set([positionKey(0, 0)]);
    board.forEach((row, r) => {
      row.forEach((_, c) => {
        if (!blocked.has(positionKey(r, c))) board[r][c] = endingTile('present');
      });
    });
    const result = spawnTile(board, VOCAB, blocked);
    expect(result).toEqual(board);
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

describe('spawnTile demand-driven formula (fixes ending/duplicate-stem pileup)', () => {
  // Fixture pool distinct from real VOCAB, so these tests are fully
  // deterministic and independent of the actual word list.
  const POOL = ['A다', 'B다', 'C다', 'D다'].map((word) => ({
    word,
    meaning: word,
    exampleSentence: `${word} example.`,
    exampleTranslation: 'example',
  }));

  it('never spawns a duplicate stem for a pool word already on the board', () => {
    // Only word A has a tile; A already has a stem, so it must not be
    // re-spawned — this is the exact bug from the screenshot (가다 and 가요
    // both present at once).
    const board = emptyBoardWith([[0, 0, stemTile('A다')]]);
    for (let trial = 0; trial < 30; trial += 1) {
      const result = spawnTile(board, [POOL[0]]);
      const spawned = result.flat().find((cell) => cell !== null && cell.id !== board[0][0]?.id);
      expect(spawned).not.toMatchObject({ kind: 'stem', word: 'A다' });
    }
  });

  it('spawns the stem of a missing pool word when endings are already saturated', () => {
    // A, B, C already have a stem each, matched 1:1 by present endings
    // (no deficit) — only D is missing, so D's stem is the sole
    // candidate.
    const board = emptyBoardWith([
      [0, 0, stemTile('A다')],
      [0, 1, stemTile('B다')],
      [0, 2, stemTile('C다')],
      [1, 0, endingTile('present')],
      [1, 1, endingTile('present')],
      [1, 2, endingTile('present')],
    ]);
    const result = spawnTile(board, POOL);
    const spawned = result.flat().find((cell, i) => cell !== null && board.flat()[i] === null);
    expect(spawned).toMatchObject({ kind: 'stem', word: 'D다' });
  });

  it('spawns a present ending when every pool word is represented but under-matched', () => {
    // All 4 pool words already have a stem on the board and there are no
    // endings at all yet — nothing is "missing", but every stem still
    // needs a present ending.
    const board = emptyBoardWith([
      [0, 0, stemTile('A다')],
      [0, 1, stemTile('B다')],
      [0, 2, stemTile('C다')],
      [0, 3, stemTile('D다')],
    ]);
    const result = spawnTile(board, POOL);
    const spawned = result.flat().find((cell, i) => cell !== null && board.flat()[i] === null);
    expect(spawned).toMatchObject({ kind: 'ending', tense: 'present' });
  });

  it('spawns a past ending when present-stage words outnumber past endings', () => {
    const board = emptyBoardWith([
      [0, 0, wordTile('A다', 'present', 'A어요')],
      [0, 1, wordTile('B다', 'present', 'B어요')],
      [0, 2, wordTile('C다', 'present', 'C어요')],
      [0, 3, wordTile('D다', 'present', 'D어요')],
    ]);
    const result = spawnTile(board, POOL);
    const spawned = result.flat().find((cell, i) => cell !== null && board.flat()[i] === null);
    expect(spawned).toMatchObject({ kind: 'ending', tense: 'past' });
  });

  it('stops spawning endings once supply already matches demand', () => {
    // 2 stems, 2 present endings already (deficit 0), and B/C are the
    // missing pool words — every spawn must be a stem for B or C, never
    // another ending.
    const board = emptyBoardWith([
      [0, 0, stemTile('A다')],
      [0, 1, stemTile('D다')],
      [0, 2, endingTile('present')],
      [0, 3, endingTile('present')],
    ]);
    for (let trial = 0; trial < 30; trial += 1) {
      const result = spawnTile(board, POOL);
      const spawned = result.flat().find((cell, i) => cell !== null && board.flat()[i] === null);
      expect(spawned?.kind).toBe('stem');
    }
  });
});

describe('spawnTile future-tense gating (Level 3, specs/tenses-v2.md)', () => {
  const POOL = ['A다', 'B다', 'C다', 'D다'].map((word) => ({
    word,
    meaning: word,
    exampleSentence: `${word} example.`,
    exampleTranslation: 'example',
  }));

  it('never spawns a future ending when futureUnlocked is false (the default)', () => {
    const board = emptyBoardWith([
      [0, 0, stemTile('A다')],
      [0, 1, stemTile('B다')],
      [0, 2, stemTile('C다')],
      [0, 3, stemTile('D다')],
    ]);
    for (let trial = 0; trial < 30; trial += 1) {
      const result = spawnTile(board, POOL);
      const spawned = result.flat().find((cell, i) => cell !== null && board.flat()[i] === null);
      expect(spawned).not.toMatchObject({ kind: 'ending', tense: 'future' });
    }
  });

  it('can spawn a future ending once futureUnlocked is true and stems are uncovered', () => {
    const board = emptyBoardWith([
      [0, 0, stemTile('A다')],
      [0, 1, stemTile('B다')],
      [0, 2, stemTile('C다')],
      [0, 3, stemTile('D다')],
    ]);
    const seenTenses = new Set<string>();
    for (let trial = 0; trial < 60; trial += 1) {
      const result = spawnTile(board, POOL, new Set(), true);
      const spawned = result.flat().find((cell, i) => cell !== null && board.flat()[i] === null);
      if (spawned?.kind === 'ending') seenTenses.add(spawned.tense);
    }
    expect(seenTenses.has('present')).toBe(true);
    expect(seenTenses.has('future')).toBe(true);
  });

  it('present and future endings share the same stem-coverage demand', () => {
    // 4 stems, already covered by 2 present + 2 future endings (deficit
    // 0 either way) — every spawn must be something other than a present
    // or future ending (here, always a fallback/other candidate never
    // arises since there are no empty pool words or past demand either,
    // so this exercises the "candidates.length === 0" generic fallback,
    // which must still never be blocked from including future once
    // unlocked — asserted indirectly via the deficit check below).
    const board = emptyBoardWith([
      [0, 0, stemTile('A다')],
      [0, 1, stemTile('B다')],
      [0, 2, endingTile('present')],
      [0, 3, endingTile('present')],
    ]);
    // A and B are covered by the 2 present endings already (deficit 0);
    // C and D are still missing their stem — so every spawn must be a
    // stem for C or D, never another present/future ending, regardless
    // of futureUnlocked.
    for (let trial = 0; trial < 30; trial += 1) {
      const result = spawnTile(board, POOL, new Set(), true);
      const spawned = result.flat().find((cell, i) => cell !== null && board.flat()[i] === null);
      expect(spawned?.kind).toBe('stem');
    }
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

  it('does not count an empty blocked cell as a remaining move', () => {
    const board = createEmptyBoard();
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        board[r][c] = endingTile('present');
      }
    }
    board[0][0] = null;
    const blocked = new Set([positionKey(0, 0)]);
    expect(isGameOver(board, blocked)).toBe(true);
  });

  it('does not treat a blocked cell as a merge partner even if it holds a tile', () => {
    const board = createEmptyBoard();
    for (let r = 0; r < BOARD_SIZE; r += 1) {
      for (let c = 0; c < BOARD_SIZE; c += 1) {
        board[r][c] = endingTile('past');
      }
    }
    board[0][0] = stemTile('가다');
    board[0][1] = endingTile('present'); // would merge with (0,0) if not blocked
    const blocked = new Set([positionKey(0, 1)]);
    expect(isGameOver(board, blocked)).toBe(true);
  });
});

describe('clearCompletedTiles', () => {
  it('removes every tile belonging to a completed word, including stray duplicates and any stage', () => {
    const board = emptyBoardWith([
      [0, 0, wordTile('먹다', 'past', '먹었어요')],
      [1, 1, stemTile('먹다')],
      [2, 2, wordTile('먹다', 'present', '먹어요')],
      [3, 3, stemTile('가다')],
    ]);
    const result = clearCompletedTiles(board, ['먹다']);
    expect(result[0][0]).toBeNull();
    expect(result[1][1]).toBeNull();
    expect(result[2][2]).toBeNull();
    expect(result[3][3]).toMatchObject({ kind: 'stem', word: '가다' });
  });

  it('leaves ending tiles alone regardless of word matching', () => {
    const board = emptyBoardWith([[0, 0, endingTile('present')]]);
    const result = clearCompletedTiles(board, ['먹다']);
    expect(result[0][0]).toMatchObject({ kind: 'ending' });
  });

  it('is a no-op when no words are completed', () => {
    const board = emptyBoardWith([[0, 0, stemTile('먹다')]]);
    expect(clearCompletedTiles(board, [])).toBe(board);
  });
});

describe('full playthrough simulation', () => {
  // Exercises the exact move -> spawnTile -> isGameOver loop apps/web
  // drives from the keyboard, over many random games, as a stand-in for
  // manual browser testing (no browser available in this environment).
  const DIRECTIONS: Direction[] = ['up', 'down', 'left', 'right'];

  it('plays many full random games without throwing and keeps state well-formed throughout', () => {
    for (let game = 0; game < 20; game += 1) {
      let board = createInitialBoard(VOCAB);
      let score = 0;
      let steps = 0;

      while (!isGameOver(board) && steps < 1000) {
        const direction = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)];
        const result = move(board, direction);

        expect(result.board).toHaveLength(BOARD_SIZE);
        result.board.forEach((row) => expect(row).toHaveLength(BOARD_SIZE));
        expect(result.scoreDelta).toBeGreaterThanOrEqual(0);
        expect(Number.isInteger(result.scoreDelta)).toBe(true);

        if (result.moved) {
          board = spawnTile(result.board, VOCAB);
          score += result.scoreDelta;
        } else {
          board = result.board;
        }
        steps += 1;
      }

      expect(score).toBeGreaterThanOrEqual(0);
      // Every game must actually terminate — if this fires, either
      // isGameOver under-detects a stuck board or move() has a bug that
      // loops forever without progress.
      expect(steps).toBeLessThan(1000);
    }
  });
});
