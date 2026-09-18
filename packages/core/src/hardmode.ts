import { positionKey } from './board';
import type { Board } from './types';

// Hard mode (specs/game-modes-v2.md, constitution.md v2 checklist): a
// modifier on Normal mode's board mechanics built around smaller/faster
// board pressure. Two pieces, combined: Normal's spawn-1-per-move becomes
// spawn-2 (apps/web/app/game.tsx calls spawnTile twice for Hard mode), and
// a small "dead zone" of cells that can never be spawned into or slid onto
// (board.ts's `blocked` param on move/spawnTile/isGameOver), relocating
// every 3-4 moves so the pressure keeps shifting instead of the player just
// learning one fixed layout.

export const HARD_MODE_BLOCKED_COUNT = 2;
export const HARD_MODE_RELOCATE_MIN = 3;
export const HARD_MODE_RELOCATE_MAX = 4;

export interface HardModeState {
  /** `positionKey` strings for the currently-blocked cells. */
  blockedCells: string[];
  movesSinceRelocate: number;
  /** Re-rolled (3 or 4) on every relocation — moves until the next one. */
  relocateEvery: number;
}

function rollRelocateEvery(random: () => number): number {
  return (
    HARD_MODE_RELOCATE_MIN +
    Math.floor(random() * (HARD_MODE_RELOCATE_MAX - HARD_MODE_RELOCATE_MIN + 1))
  );
}

/**
 * Picks `count` cells to block, chosen only from cells that are currently
 * empty — a relocation must never trap a live tile under a wall it can no
 * longer slide out from under. Returns fewer than `count` (down to none) if
 * the board doesn't have enough empty cells right now.
 */
export function pickBlockedCells(
  board: Board,
  count: number,
  random: () => number = Math.random,
): string[] {
  const emptyKeys: string[] = [];
  board.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell === null) emptyKeys.push(positionKey(r, c));
    });
  });

  const shuffled = emptyKeys.slice();
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export function createHardModeState(board: Board, random: () => number = Math.random): HardModeState {
  return {
    blockedCells: pickBlockedCells(board, HARD_MODE_BLOCKED_COUNT, random),
    movesSinceRelocate: 0,
    relocateEvery: rollRelocateEvery(random),
  };
}

/**
 * Call after each move with the post-move, pre-spawn board (so relocation
 * only ever considers cells that are actually empty right now). Keeps the
 * existing dead zone until `relocateEvery` moves have passed, then moves it
 * and re-rolls the next interval. If the board has no empty cells to
 * relocate into when it's due, the existing zone is kept for one more move
 * rather than disappearing.
 */
export function advanceHardMode(
  state: HardModeState,
  board: Board,
  random: () => number = Math.random,
): HardModeState {
  const movesSinceRelocate = state.movesSinceRelocate + 1;
  if (movesSinceRelocate < state.relocateEvery) {
    return { ...state, movesSinceRelocate };
  }

  const relocated = pickBlockedCells(board, HARD_MODE_BLOCKED_COUNT, random);
  return {
    blockedCells: relocated.length > 0 ? relocated : state.blockedCells,
    movesSinceRelocate: 0,
    relocateEvery: rollRelocateEvery(random),
  };
}

export function blockedSet(state: HardModeState): Set<string> {
  return new Set(state.blockedCells);
}
