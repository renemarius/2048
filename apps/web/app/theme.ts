export type Theme = 'classic' | 'modern';

export const THEMES: Array<[Theme, string]> = [
  ['classic', 'Classic'],
  ['modern', 'Modern ink & paper'],
];

const STORAGE_KEY = 'theme';

export function loadTheme(): Theme {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'modern' ? 'modern' : 'classic';
  } catch {
    return 'classic';
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
