import { describe, expect, it } from 'vitest';
import {
  THEMES,
  THEME_IDS,
  THEME_TOKEN_KEYS,
  colorDistance,
  contrastRatio,
  isThemeId,
  themeCss,
} from './themes';

const TILE_PAIRS = [
  ['tile-stem', 'tile-stem-text'],
  ['tile-ending', 'tile-ending-text'],
  ['tile-word-present', 'tile-word-present-text'],
  ['tile-word-past', 'tile-word-past-text'],
  ['tile-word-future', 'tile-word-future-text'],
] as const;

const TILE_BGS = TILE_PAIRS.map(([bg]) => bg);

describe('theme registry', () => {
  it('has one definition per id, in id order', () => {
    expect(THEMES.map((t) => t.id)).toEqual([...THEME_IDS]);
  });

  it('defines every token in every theme', () => {
    for (const t of THEMES) {
      expect(Object.keys(t.tokens).sort(), t.id).toEqual([...THEME_TOKEN_KEYS].sort());
    }
  });

  it('isThemeId rejects unknown values', () => {
    expect(isThemeId('cat')).toBe(true);
    expect(isThemeId('neon')).toBe(false);
    expect(isThemeId(null)).toBe(false);
  });

  it('emits a CSS block per theme, with classic also on :root', () => {
    const css = themeCss();
    for (const id of THEME_IDS) expect(css).toContain(`[data-theme='${id}']`);
    expect(css).toContain(":root, [data-theme='classic']");
  });
});

describe.each(THEMES.filter((t) => !t.legacyPalette))('$id palette', (theme) => {
  const { tokens } = theme;

  it.each(TILE_PAIRS)('%s text meets 4.5:1 against its tile', (bg, text) => {
    expect(contrastRatio(tokens[bg], tokens[text])).toBeGreaterThanOrEqual(4.5);
  });

  it('page text, dictionary text and board-adjacent UI are readable', () => {
    expect(contrastRatio(tokens['ui-text'], tokens['page-bg'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(tokens['dict-text'], tokens['dict-screen-bg'])).toBeGreaterThanOrEqual(4.5);
  });

  it('text on the board and empty cells is readable (scores, bank, buttons)', () => {
    expect(contrastRatio(tokens['board-text'], tokens['board-bg'])).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(tokens['board-text'], tokens['cell-empty'])).toBeGreaterThanOrEqual(4.5);
  });

  it('feedback colours are visible against the page', () => {
    expect(contrastRatio(tokens['feedback-correct'], tokens['page-bg'])).toBeGreaterThanOrEqual(3);
    expect(contrastRatio(tokens['feedback-wrong'], tokens['page-bg'])).toBeGreaterThanOrEqual(3);
  });

  it('keeps all five tile types visibly distinct from each other', () => {
    for (let i = 0; i < TILE_BGS.length; i++) {
      for (let j = i + 1; j < TILE_BGS.length; j++) {
        const d = colorDistance(tokens[TILE_BGS[i]], tokens[TILE_BGS[j]]);
        expect(d, `${TILE_BGS[i]} vs ${TILE_BGS[j]}`).toBeGreaterThanOrEqual(15);
      }
    }
  });

  it('keeps tiles and empty cells distinct from the board', () => {
    for (const bg of TILE_BGS) {
      expect(colorDistance(tokens[bg], tokens['board-bg']), bg).toBeGreaterThanOrEqual(10);
    }
    expect(colorDistance(tokens['cell-empty'], tokens['board-bg'])).toBeGreaterThanOrEqual(5);
  });
});
