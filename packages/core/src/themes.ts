export const THEME_IDS = [
  'classic',
  'modern',
  'monochrome',
  'pastel',
  'rgb',
  'tech',
  'cat',
  'dog',
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const THEME_TOKEN_KEYS = [
  'page-bg',
  'board-bg',
  'cell-empty',
  'board-text',
  'tile-stem',
  'tile-stem-text',
  'tile-ending',
  'tile-ending-text',
  'tile-word-present',
  'tile-word-present-text',
  'tile-word-past',
  'tile-word-past-text',
  'tile-word-future',
  'tile-word-future-text',
  'ui-text',
  'feedback-correct',
  'feedback-wrong',
  'dict-bezel-bg',
  'dict-screen-bg',
  'dict-text',
  'dict-meaning-text',
  'dict-divider',
  'dict-margin',
] as const;

export type ThemeTokenKey = (typeof THEME_TOKEN_KEYS)[number];
export type ThemeTokens = Record<ThemeTokenKey, string>;

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  emoji: string;
  tokens: ThemeTokens;
  // Classic and Modern shipped before the contrast bar existed and keep
  // their original palettes; every newer theme must pass it.
  legacyPalette?: boolean;
}

export const DEFAULT_THEME: ThemeId = 'classic';

export const THEMES: readonly ThemeDefinition[] = [
  {
    id: 'classic',
    label: 'Classic',
    emoji: '🟧',
    legacyPalette: true,
    tokens: {
      'page-bg': '#faf8ef',
      'board-bg': '#bbada0',
      'cell-empty': '#cdc1b4',
      'board-text': '#776e65',
      'tile-stem': '#eee4da',
      'tile-stem-text': '#776e65',
      'tile-ending': '#f2b179',
      'tile-ending-text': '#ffffff',
      'tile-word-present': '#f59563',
      'tile-word-present-text': '#ffffff',
      'tile-word-past': '#e2543a',
      'tile-word-past-text': '#ffffff',
      'tile-word-future': '#6b5b95',
      'tile-word-future-text': '#ffffff',
      'ui-text': '#776e65',
      'feedback-correct': '#5d9c59',
      'feedback-wrong': '#c0392b',
      'dict-bezel-bg': '#bbada0',
      'dict-screen-bg': '#eee4da',
      'dict-text': '#776e65',
      'dict-meaning-text': 'rgba(119, 110, 101, 0.7)',
      'dict-divider': 'rgba(119, 110, 101, 0.15)',
      'dict-margin': 'transparent',
    },
  },
  {
    id: 'modern',
    label: 'Modern ink & paper',
    emoji: '📓',
    legacyPalette: true,
    tokens: {
      'page-bg': '#f7f5f1',
      'board-bg': '#e8e4dc',
      'cell-empty': '#dcd7cc',
      'board-text': '#2b2b2b',
      'tile-stem': '#dcd7cc',
      'tile-stem-text': '#2b2b2b',
      'tile-ending': '#b33a3a',
      'tile-ending-text': '#ffffff',
      'tile-word-present': '#a9c4b8',
      'tile-word-present-text': '#2b2b2b',
      'tile-word-past': '#7a9e8e',
      'tile-word-past-text': '#ffffff',
      'tile-word-future': '#6c8fae',
      'tile-word-future-text': '#ffffff',
      'ui-text': '#2b2b2b',
      'feedback-correct': '#3f7d5c',
      'feedback-wrong': '#b33a3a',
      'dict-bezel-bg': '#f7f5f1',
      'dict-screen-bg': '#f7f5f1',
      'dict-text': '#2b2b2b',
      'dict-meaning-text': 'rgba(43, 43, 43, 0.65)',
      'dict-divider': '#c9d6e3',
      'dict-margin': '#d98a8a',
    },
  },
  {
    id: 'monochrome',
    label: 'Monochrome',
    emoji: '⚫',
    tokens: {
      'page-bg': '#f2f2f2',
      'board-bg': '#111111',
      'cell-empty': '#262626',
      'board-text': '#ffffff',
      'tile-stem': '#f7f7f7',
      'tile-stem-text': '#111111',
      'tile-ending': '#bcbcbc',
      'tile-ending-text': '#111111',
      'tile-word-present': '#8a8a8a',
      'tile-word-present-text': '#111111',
      'tile-word-past': '#5c5c5c',
      'tile-word-past-text': '#ffffff',
      'tile-word-future': '#353535',
      'tile-word-future-text': '#ffffff',
      'ui-text': '#111111',
      'feedback-correct': '#1b6e1f',
      'feedback-wrong': '#b3261e',
      'dict-bezel-bg': '#111111',
      'dict-screen-bg': '#f7f7f7',
      'dict-text': '#111111',
      'dict-meaning-text': 'rgba(17, 17, 17, 0.7)',
      'dict-divider': 'rgba(17, 17, 17, 0.15)',
      'dict-margin': 'transparent',
    },
  },
  {
    id: 'pastel',
    label: 'Pastel',
    emoji: '🌸',
    tokens: {
      'page-bg': '#fff7f2',
      'board-bg': '#e6d3e3',
      'cell-empty': '#f3e6f0',
      'board-text': '#4a3f55',
      'tile-stem': '#fff1d6',
      'tile-stem-text': '#4a3f55',
      'tile-ending': '#ffb3c6',
      'tile-ending-text': '#4a3f55',
      'tile-word-present': '#a9d6ff',
      'tile-word-present-text': '#4a3f55',
      'tile-word-past': '#a8e6c3',
      'tile-word-past-text': '#4a3f55',
      'tile-word-future': '#cdb4f6',
      'tile-word-future-text': '#4a3f55',
      'ui-text': '#4a3f55',
      'feedback-correct': '#2f7d4f',
      'feedback-wrong': '#b3365a',
      'dict-bezel-bg': '#e6d3e3',
      'dict-screen-bg': '#fff7f2',
      'dict-text': '#4a3f55',
      'dict-meaning-text': 'rgba(74, 63, 85, 0.72)',
      'dict-divider': 'rgba(74, 63, 85, 0.15)',
      'dict-margin': 'transparent',
    },
  },
  {
    id: 'rgb',
    label: 'RGB',
    emoji: '🌈',
    tokens: {
      'page-bg': '#0b0b10',
      'board-bg': '#1a1a24',
      'cell-empty': '#282838',
      'board-text': '#e8e8f0',
      'tile-stem': '#3a3a4e',
      'tile-stem-text': '#f0f0f5',
      'tile-ending': '#d32f2f',
      'tile-ending-text': '#ffffff',
      'tile-word-present': '#2e7d32',
      'tile-word-present-text': '#ffffff',
      'tile-word-past': '#1565c0',
      'tile-word-past-text': '#ffffff',
      'tile-word-future': '#f9a825',
      'tile-word-future-text': '#111111',
      'ui-text': '#e8e8f0',
      'feedback-correct': '#4cd964',
      'feedback-wrong': '#ff5a5f',
      'dict-bezel-bg': '#1a1a24',
      'dict-screen-bg': '#14141c',
      'dict-text': '#e8e8f0',
      'dict-meaning-text': 'rgba(232, 232, 240, 0.7)',
      'dict-divider': 'rgba(232, 232, 240, 0.15)',
      'dict-margin': 'transparent',
    },
  },
  {
    id: 'tech',
    label: 'Tech',
    emoji: '💻',
    tokens: {
      'page-bg': '#0a0f14',
      'board-bg': '#121c24',
      'cell-empty': '#1b2a35',
      'board-text': '#b8d4e0',
      'tile-stem': '#244152',
      'tile-stem-text': '#d4eef8',
      'tile-ending': '#00e5ff',
      'tile-ending-text': '#001018',
      'tile-word-present': '#00c853',
      'tile-word-present-text': '#00150a',
      'tile-word-past': '#ff9100',
      'tile-word-past-text': '#1a0d00',
      'tile-word-future': '#b388ff',
      'tile-word-future-text': '#12001f',
      'ui-text': '#b8d4e0',
      'feedback-correct': '#00e676',
      'feedback-wrong': '#ff5252',
      'dict-bezel-bg': '#121c24',
      'dict-screen-bg': '#0a0f14',
      'dict-text': '#b8f5d0',
      'dict-meaning-text': 'rgba(184, 245, 208, 0.7)',
      'dict-divider': 'rgba(0, 229, 255, 0.2)',
      'dict-margin': 'transparent',
    },
  },
  {
    id: 'cat',
    label: 'Cat',
    emoji: '🐱',
    tokens: {
      'page-bg': '#fff4e6',
      'board-bg': '#7a4e32',
      'cell-empty': '#8a5a3c',
      'board-text': '#fff4e6',
      'tile-stem': '#fde7c8',
      'tile-stem-text': '#4a2c1a',
      'tile-ending': '#ffb6c1',
      'tile-ending-text': '#4a2c1a',
      'tile-word-present': '#ff9f43',
      'tile-word-present-text': '#3a1f10',
      'tile-word-past': '#6d6f78',
      'tile-word-past-text': '#ffffff',
      'tile-word-future': '#3b3b45',
      'tile-word-future-text': '#ffffff',
      'ui-text': '#4a2c1a',
      'feedback-correct': '#2e7d32',
      'feedback-wrong': '#b3261e',
      'dict-bezel-bg': '#7a4e32',
      'dict-screen-bg': '#fde7c8',
      'dict-text': '#4a2c1a',
      'dict-meaning-text': 'rgba(74, 44, 26, 0.7)',
      'dict-divider': 'rgba(74, 44, 26, 0.15)',
      'dict-margin': 'transparent',
    },
  },
  {
    id: 'dog',
    label: 'Dog',
    emoji: '🐶',
    tokens: {
      'page-bg': '#eef6fb',
      'board-bg': '#6a994e',
      'cell-empty': '#86b369',
      'board-text': '#2a1d10',
      'tile-stem': '#f6e7cb',
      'tile-stem-text': '#4a3420',
      'tile-ending': '#e8b04a',
      'tile-ending-text': '#3a2810',
      'tile-word-present': '#a0673a',
      'tile-word-present-text': '#ffffff',
      'tile-word-past': '#3f6fb5',
      'tile-word-past-text': '#ffffff',
      'tile-word-future': '#c0392b',
      'tile-word-future-text': '#ffffff',
      'ui-text': '#3a2a1c',
      'feedback-correct': '#2e7d32',
      'feedback-wrong': '#b3261e',
      'dict-bezel-bg': '#6a994e',
      'dict-screen-bg': '#f6e7cb',
      'dict-text': '#4a3420',
      'dict-meaning-text': 'rgba(74, 52, 32, 0.7)',
      'dict-divider': 'rgba(74, 52, 32, 0.15)',
      'dict-margin': 'transparent',
    },
  },
];

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === 'string' && (THEME_IDS as readonly string[]).includes(value);
}

export function themeById(id: ThemeId): ThemeDefinition {
  return THEMES.find((t) => t.id === id)!;
}

export function themeCss(): string {
  return THEMES.map((t) => {
    const selector = t.id === DEFAULT_THEME ? `:root, [data-theme='${t.id}']` : `[data-theme='${t.id}']`;
    const body = THEME_TOKEN_KEYS.map((k) => `--${k}:${t.tokens[k]};`).join('');
    return `${selector}{${body}}`;
  }).join('\n');
}

function channel(hex: string, i: number): number {
  return parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
}

function linear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  return 0.2126 * linear(channel(hex, 0)) + 0.7152 * linear(channel(hex, 1)) + 0.0722 * linear(channel(hex, 2));
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

function lab(hex: string): [number, number, number] {
  const r = linear(channel(hex, 0));
  const g = linear(channel(hex, 1));
  const b = linear(channel(hex, 2));
  const x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z))];
}

// CIE76 colour difference — enough to tell "visibly different tile" apart
// from "near-identical", which is all the tile-distinguishability check needs.
export function colorDistance(a: string, b: string): number {
  const [l1, a1, b1] = lab(a);
  const [l2, a2, b2] = lab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}
