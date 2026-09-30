'use client';

import { useEffect, useState } from 'react';
import {
  STATS_MODES,
  averageScore,
  dictionaryStats,
  type PlayerStats,
  type StatsMode,
} from 'core';
import styles from './game.module.css';
import { meaningFor } from './dictionary-storage';
import { clearAllLocalData, loadOrCreateGuestName } from './identity';
import { loadBestScore, loadDictionary, loadStats } from './progress-store';
import { THEMES, applyTheme, loadTheme, type Theme } from './theme';

const MODE_LABELS: Record<StatsMode, string> = {
  normal: 'Normal',
  hard: 'Hard',
  concentration: 'Concentration',
  connectives: 'Sentences',
};

export function SettingsButton({ onOpenChange }: { onOpenChange?: (open: boolean) => void }) {
  const [open, setOpenState] = useState(false);

  function setOpen(next: boolean) {
    setOpenState(next);
    onOpenChange?.(next);
  }

  return (
    <>
      <button type="button" className={styles.button} onClick={() => setOpen(true)}>
        Settings
      </button>
      {open && <SettingsPanel onClose={() => setOpen(false)} />}
    </>
  );
}

function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [theme, setTheme] = useState<Theme>('classic');
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [bests, setBests] = useState<Record<StatsMode, number> | null>(null);
  const [dict, setDict] = useState<ReturnType<typeof dictionaryStats> | null>(null);
  const [confirmingReset, setConfirmingReset] = useState(false);

  // Read on open rather than on mount of the page: the games write to
  // localStorage, so this always reflects the latest state.
  useEffect(() => {
    setName(loadOrCreateGuestName());
    setTheme(loadTheme());
    setStats(loadStats());
    setBests(
      Object.fromEntries(STATS_MODES.map((mode) => [mode, loadBestScore(mode)])) as Record<
        StatsMode,
        number
      >,
    );
    setDict(dictionaryStats(loadDictionary()));
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  function handleTheme(next: Theme) {
    setTheme(next);
    applyTheme(next, true);
  }

  function handleReset() {
    clearAllLocalData();
    window.location.reload();
  }

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modal} ${styles.settingsModal}`} role="dialog" aria-label="Settings">
        <div className={styles.settingsHeader}>
          <h2>Settings</h2>
          <button type="button" className={styles.dictionaryClose} onClick={onClose} aria-label="Close settings">
            ×
          </button>
        </div>

        <section className={styles.settingsSection}>
          <h3>Profile</h3>
          <dl className={styles.statList}>
            <div className={styles.statRow}>
              <dt>Playing as</dt>
              <dd>{name} (guest)</dd>
            </div>
          </dl>

          {bests && (
            <>
              <h4>Best scores</h4>
              <dl className={styles.statList}>
                {STATS_MODES.map((mode) => (
                  <div key={mode} className={styles.statRow}>
                    <dt>{MODE_LABELS[mode]}</dt>
                    <dd>{bests[mode]}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}

          {dict && (
            <>
              <h4>Words</h4>
              <dl className={styles.statList}>
                <div className={styles.statRow}>
                  <dt>Words learned</dt>
                  <dd>
                    {dict.wordsLearned} (L1 {dict.level1} · L2 {dict.level2})
                  </dd>
                </div>
                <div className={styles.statRow}>
                  <dt>Total conjugations</dt>
                  <dd>{dict.totalConjugations}</dd>
                </div>
                <div className={styles.statRow}>
                  <dt>Most drilled</dt>
                  <dd>
                    {dict.mostDrilled
                      ? `${dict.mostDrilled.word} ${meaningFor(dict.mostDrilled.word)} ×${dict.mostDrilled.count}`
                      : '—'}
                  </dd>
                </div>
                <div className={styles.statRow}>
                  <dt>Starred</dt>
                  <dd>{dict.starred}</dd>
                </div>
              </dl>
            </>
          )}

          {stats && (
            <>
              <h4>Games played</h4>
              <dl className={styles.statList}>
                {STATS_MODES.map((mode) => (
                  <div key={mode} className={styles.statRow}>
                    <dt>{MODE_LABELS[mode]}</dt>
                    <dd>{stats.gamesPlayed[mode]}</dd>
                  </div>
                ))}
              </dl>

              <h4>Points per session</h4>
              {stats.recentSessions.length === 0 ? (
                <p className={styles.settingsMuted}>No finished sessions yet.</p>
              ) : (
                <>
                  <p className={styles.settingsMuted}>
                    Average of last {stats.recentSessions.length}: {averageScore(stats.recentSessions)}
                  </p>
                  <ol className={styles.sessionList}>
                    {stats.recentSessions.map((session) => (
                      <li key={`${session.endedAt}-${session.mode}`}>
                        <span>{MODE_LABELS[session.mode]}</span>
                        <span>{session.score}</span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </>
          )}
        </section>

        <section className={styles.settingsSection}>
          <h3>Theme</h3>
          <div className={styles.modeSwitcher} role="radiogroup" aria-label="Theme">
            {THEMES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={theme === value}
                className={`${styles.modeButton} ${theme === value ? styles.modeButtonActive : ''}`}
                onClick={() => handleTheme(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.settingsSection}>
          <h3>Reset data</h3>
          <p className={styles.settingsMuted}>
            Erases your dictionary, best scores, stats, name, and saved games on this device.
          </p>
          {confirmingReset ? (
            <div className={styles.settingsRow}>
              <button type="button" className={`${styles.button} ${styles.dangerButton}`} onClick={handleReset}>
                Yes, erase everything
              </button>
              <button type="button" className={styles.button} onClick={() => setConfirmingReset(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`${styles.button} ${styles.dangerButton}`}
              onClick={() => setConfirmingReset(true)}
            >
              Reset all data…
            </button>
          )}
        </section>
      </div>
    </div>
  );
}
