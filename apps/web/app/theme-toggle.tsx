'use client';

import { useEffect, useState } from 'react';

type Theme = 'classic' | 'modern';

const STORAGE_KEY = 'theme';

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('classic');

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'classic' || stored === 'modern') {
      setTheme(stored);
      document.documentElement.setAttribute('data-theme', stored);
    }
  }, []);

  function toggle() {
    const next: Theme = theme === 'classic' ? 'modern' : 'classic';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button type="button" onClick={toggle}>
      Theme: {theme === 'classic' ? 'Classic' : 'Modern ink & paper'}
    </button>
  );
}
