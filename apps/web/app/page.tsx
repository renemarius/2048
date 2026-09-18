'use client';

import { useEffect, useState } from 'react';
import { Concentration } from './concentration';
import { Game } from './game';
import type { GameMode } from './mode-switcher';

const MODE_KEY = '2048-hangul:mode';

function isGameMode(value: string | null): value is GameMode {
  return value === 'normal' || value === 'hard' || value === 'concentration';
}

export default function Home() {
  const [mode, setMode] = useState<GameMode>('normal');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(MODE_KEY);
      if (isGameMode(saved)) setMode(saved);
    } catch {
      // localStorage unavailable — just start on Normal.
    }
  }, []);

  function selectMode(next: GameMode) {
    setMode(next);
    try {
      window.localStorage.setItem(MODE_KEY, next);
    } catch {
      // see above
    }
  }

  return mode === 'concentration' ? (
    <Concentration mode={mode} onModeChange={selectMode} />
  ) : (
    // key={mode} forces a full remount on Normal<->Hard switches, so each
    // mode's session/board/hard-mode state initializes cleanly from its own
    // localStorage key rather than needing mid-lifecycle reset logic inside
    // Game.
    <Game key={mode} mode={mode} onModeChange={selectMode} />
  );
}
