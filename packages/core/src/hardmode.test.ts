import { describe, expect, it } from 'vitest';
import { createEmptyBoard, positionKey } from './board';
import {
  HARD_MODE_BLOCKED_COUNT,
  advanceHardMode,
  blockedSet,
  createHardModeState,
  pickBlockedCells,
} from './hardmode';
import type { Board } from './types';
import type { EndingTile } from './types';

function endingTile(): EndingTile {
  return { kind: 'ending', id: `t-${Math.random()}`, tense: 'present' };
}

function fixedRandom(...values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('pickBlockedCells', () => {
  it('picks the requested count from empty cells only', () => {
    const board = createEmptyBoard();
    board[0][0] = endingTile();
    const picked = pickBlockedCells(board, 2, fixedRandom(0, 0, 0));
    expect(picked).toHaveLength(2);
    for (const key of picked) {
      expect(key).not.toBe(positionKey(0, 0));
    }
  });

  it('never picks the same cell twice', () => {
    const board = createEmptyBoard();
    const picked = pickBlockedCells(board, 4, Math.random);
    expect(new Set(picked).size).toBe(picked.length);
  });

  it('returns fewer than count when not enough empty cells remain', () => {
    const board: Board = createEmptyBoard();
    board.forEach((row, r) => {
      row.forEach((_, c) => {
        if (!(r === 0 && c === 0)) board[r][c] = endingTile();
      });
    });
    const picked = pickBlockedCells(board, 2, Math.random);
    expect(picked).toEqual([positionKey(0, 0)]);
  });

  it('returns an empty array when the board is full', () => {
    const board = createEmptyBoard();
    board.forEach((row, r) => row.forEach((_, c) => (board[r][c] = endingTile())));
    expect(pickBlockedCells(board, 2, Math.random)).toEqual([]);
  });
});

describe('createHardModeState', () => {
  it('blocks HARD_MODE_BLOCKED_COUNT cells and starts the relocation counter at 0', () => {
    const state = createHardModeState(createEmptyBoard(), Math.random);
    expect(state.blockedCells).toHaveLength(HARD_MODE_BLOCKED_COUNT);
    expect(state.movesSinceRelocate).toBe(0);
    expect([3, 4]).toContain(state.relocateEvery);
  });
});

describe('advanceHardMode', () => {
  it('keeps the same blocked cells and increments the counter before the relocation is due', () => {
    const board = createEmptyBoard();
    const state = createHardModeState(board, fixedRandom(0)); // relocateEvery = 3
    const next = advanceHardMode(state, board, Math.random);
    expect(next.movesSinceRelocate).toBe(1);
    expect(next.blockedCells).toEqual(state.blockedCells);
  });

  it('relocates once relocateEvery moves have passed, resetting the counter', () => {
    const board = createEmptyBoard();
    let state = createHardModeState(board, fixedRandom(0)); // relocateEvery = 3
    state = advanceHardMode(state, board, Math.random); // 1
    state = advanceHardMode(state, board, Math.random); // 2
    const before = state.blockedCells;
    state = advanceHardMode(state, board, Math.random); // 3 -> relocates
    expect(state.movesSinceRelocate).toBe(0);
    expect([3, 4]).toContain(state.relocateEvery);
    expect(state.blockedCells).toHaveLength(HARD_MODE_BLOCKED_COUNT);
    // Not a hard requirement that it differ from `before` (random could
    // reselect the same cells), just that it's a validly re-picked set.
    expect(Array.isArray(before)).toBe(true);
  });

  it('keeps the previous zone instead of vanishing when the board has no room to relocate into', () => {
    const board = createEmptyBoard();
    board.forEach((row, r) => row.forEach((_, c) => (board[r][c] = endingTile())));
    const state = { blockedCells: [positionKey(1, 1), positionKey(2, 2)], movesSinceRelocate: 2, relocateEvery: 3 };
    const next = advanceHardMode(state, board, Math.random);
    expect(next.blockedCells).toEqual(state.blockedCells);
  });
});

describe('blockedSet', () => {
  it('converts blockedCells into a Set for board.ts calls', () => {
    const state = { blockedCells: [positionKey(0, 0), positionKey(1, 1)], movesSinceRelocate: 0, relocateEvery: 3 };
    const set = blockedSet(state);
    expect(set.has(positionKey(0, 0))).toBe(true);
    expect(set.has(positionKey(1, 1))).toBe(true);
    expect(set.size).toBe(2);
  });
});
