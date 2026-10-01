import { DEFAULT_THEME, THEMES, isThemeId, type ThemeId } from 'core';

export type Theme = ThemeId;
export { THEMES };

const STORAGE_KEY = 'theme';

export function loadTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isThemeId(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: Theme, persist = false): void {
  document.documentElement.setAttribute('data-theme', theme);
  if (!persist) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // theme just won't survive a reload
  }
}
