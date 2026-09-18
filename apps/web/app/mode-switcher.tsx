'use client';

import styles from './game.module.css';

// Three modes as of v2 (specs/game-modes-v2.md): Normal (v1's mechanic,
// unmodified), Hard (Normal + smaller/faster board pressure), and
// Concentration (a standalone memory-match minigame). Shared by Game
// (Normal/Hard) and Concentration so the switcher stays visually and
// behaviorally identical no matter which screen is showing.
export type GameMode = 'normal' | 'hard' | 'concentration';

const MODES: Array<[GameMode, string]> = [
  ['normal', 'Normal'],
  ['hard', 'Hard'],
  ['concentration', 'Concentration'],
];

export function ModeSwitcher({
  mode,
  onChange,
}: {
  mode: GameMode;
  onChange: (mode: GameMode) => void;
}) {
  return (
    <div className={styles.modeSwitcher} role="tablist" aria-label="Game mode">
      {MODES.map(([value, label]) => (
        <button
          key={value}
          type="button"
          role="tab"
          aria-selected={mode === value}
          className={`${styles.modeButton} ${mode === value ? styles.modeButtonActive : ''}`}
          onClick={() => onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
