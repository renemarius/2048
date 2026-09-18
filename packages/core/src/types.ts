// Board/tile shape per constitution.md Section 3. Move/merge/spawn logic
// is not implemented yet (v1 checklist item, still open) — these types
// exist so that piece has a fixed shape to build against.

export type Direction = 'up' | 'down' | 'left' | 'right';

export type ConjugationStage = 'present' | 'past' | 'future';

export interface StemTile {
  kind: 'stem';
  id: string;
  /** Dictionary form, e.g. "먹다". */
  word: string;
}

export interface EndingTile {
  kind: 'ending';
  id: string;
  tense: ConjugationStage;
}

export interface WordTile {
  kind: 'word';
  id: string;
  /** Dictionary form this tile is a conjugation of, e.g. "먹다". */
  word: string;
  stage: ConjugationStage;
  /** The rendered conjugated form, e.g. "먹어요". */
  surfaceForm: string;
}

export type Tile = StemTile | EndingTile | WordTile;

export type Cell = Tile | null;

/** 4x4 grid, indexed [row][col]. */
export type Board = Cell[][];
