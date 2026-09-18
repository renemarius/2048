// Per-mode localStorage key helpers (specs/game-modes-v2.md "Per-mode
// scoring"). Normal mode falls back to the pre-v2 unsuffixed keys when its
// suffixed key is empty, so a player's existing Normal-mode board/best
// score from before this feature carries forward instead of resetting.
// Hard and Concentration have no legacy key to fall back to — they're new.

export const LEGACY_SESSION_KEY = '2048-hangul:session';
export const LEGACY_BEST_SCORE_KEY = '2048-hangul:bestScore';

export function sessionKey(mode: string): string {
  return `2048-hangul:session:${mode}`;
}

export function bestScoreKey(mode: string): string {
  return `2048-hangul:bestScore:${mode}`;
}
