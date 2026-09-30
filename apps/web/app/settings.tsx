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
import { logIn, logOut, signUp, useAuth } from './auth';
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
          <AccountSection guestName={name} />

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

function AccountSection({ guestName }: { guestName: string }) {
  const auth = useAuth();
  const [form, setForm] = useState<'signup' | 'login'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!auth.ready) return null;

  if (auth.user) {
    return (
      <>
        <dl className={styles.statList}>
          <div className={styles.statRow}>
            <dt>Signed in as</dt>
            <dd>{auth.username ?? auth.user.email}</dd>
          </div>
          <div className={styles.statRow}>
            <dt>Email</dt>
            <dd>{auth.user.email}</dd>
          </div>
        </dl>
        {!auth.verified && (
          <p className={styles.settingsMuted}>Verify your email to start syncing your progress.</p>
        )}
        <button type="button" className={styles.button} onClick={() => void logOut()}>
          Log out
        </button>
      </>
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const result =
      form === 'signup' ? await signUp(email, password, username.trim()) : await logIn(email, password);
    setBusy(false);
    if (!result.ok) setError(result.error);
    else if (result.message) setNotice(result.message);
  }

  return (
    <>
      <dl className={styles.statList}>
        <div className={styles.statRow}>
          <dt>Playing as</dt>
          <dd>{guestName} (guest)</dd>
        </div>
      </dl>
      {auth.available && (
        <form className={styles.authForm} onSubmit={submit}>
          <div className={styles.modeSwitcher} role="tablist" aria-label="Account">
            {(
              [
                ['login', 'Log in'],
                ['signup', 'Sign up'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={form === value}
                className={`${styles.modeButton} ${form === value ? styles.modeButtonActive : ''}`}
                onClick={() => {
                  setForm(value);
                  setError(null);
                  setNotice(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          {form === 'signup' && (
            <input
              type="text"
              className={styles.dictionarySearch}
              placeholder="Username"
              value={username}
              maxLength={24}
              autoComplete="username"
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          )}
          <input
            type="email"
            className={styles.dictionarySearch}
            placeholder="Email"
            value={email}
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            type="password"
            className={styles.dictionarySearch}
            placeholder="Password"
            value={password}
            minLength={form === 'signup' ? 8 : undefined}
            autoComplete={form === 'signup' ? 'new-password' : 'current-password'}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {error && <p className={styles.authError}>{error}</p>}
          {notice && <p className={styles.settingsMuted}>{notice}</p>}
          <button type="submit" className={styles.button} disabled={busy}>
            {busy ? '…' : form === 'signup' ? 'Create account' : 'Log in'}
          </button>
        </form>
      )}
    </>
  );
}
