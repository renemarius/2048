import { conjugateBatchimFinal, conjugateHada } from 'core';
import { ThemeToggle } from './theme-toggle';
import styles from './page.module.css';

// Scaffold-stage placeholder: proves the theme token system, the font,
// and the packages/core wiring all work end-to-end. This is not the real
// board — move/merge/spawn logic (constitution.md v1 checklist) is still
// unbuilt.
const sampleTiles = [
  { key: 'stem', className: styles.stem, label: '먹-' },
  { key: 'ending', className: styles.ending, label: '-어요' },
  {
    key: 'word-present',
    className: styles.wordPresent,
    label: conjugateBatchimFinal('먹다', 'present'),
  },
  {
    key: 'word-past',
    className: styles.wordPast,
    label: conjugateBatchimFinal('먹다', 'past'),
  },
];

export default function Home() {
  return (
    <main className={styles.main}>
      <h1>2048 Hangul Conjugation — scaffold</h1>
      <ThemeToggle />
      <div className={styles.board}>
        {sampleTiles.map((tile) => (
          <div key={tile.key} className={`${styles.cell} ${tile.className}`}>
            {tile.label}
          </div>
        ))}
      </div>
      <p>
        Engine check (packages/core): 공부하다 past tense ={' '}
        {conjugateHada('공부하다', 'past')}
      </p>
    </main>
  );
}
