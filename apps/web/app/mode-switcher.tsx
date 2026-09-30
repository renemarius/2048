'use client';

import styles from './game.module.css';

// Four modes as of v2 (specs/game-modes-v2.md, specs/connectives-v2.md):
// Normal (v1's mechanic, unmodified), Hard (Normal + smaller/faster board
// pressure), Concentration (a standalone memory-match minigame), and
// Sentences (the connective-forms Sentence Builder). Shared by every mode's
// screen so the switcher stays visually and behaviorally identical no
// matter which one is showing.
export type GameMode = 'normal' | 'hard' | 'concentration' | 'connectives';

const MODES: Array<[GameMode, string]> = [
  ['normal', 'Normal'],
  ['hard', 'Hard'],
  ['concentration', 'Concentration'],
  ['connectives', 'Sentences'],
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
