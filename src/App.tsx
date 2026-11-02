import { useEffect, useState } from 'react';
import './App.css';
import { GameBoard } from './ui/GameBoard';
import { Hud } from './ui/Hud';
import { Controls } from './ui/Controls';
import { HelpModal } from './ui/HelpModal';
import { GameOverModal } from './ui/GameOverModal';
import { useGameStore } from './hooks/useGameStore';
import type { GameState, Move } from './core';

function App() {
  const [menu, setMenu] = useState<'help' | 'settings' | null>(null);
  const [dismissedResult, setDismissedResult] = useState<GameState | null>(null);
  const game = useGameStore((s) => s.game);
  const round = useGameStore((s) => s.round);
  const ai1 = useGameStore((s) => s.aiPlayers[0]);
  const ai2 = useGameStore((s) => s.aiPlayers[1]);
  const start = useGameStore((s) => s.startNewGame);
  useEffect(() => {
    const store = useGameStore.getState();
    if (menu || game.status !== 'playing' || !(game.turn === 0 ? ai1 : ai2)) { store.setThinking(false); return; }
    let worker: Worker | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    store.setThinking(true);
    const fail = () => { if (active) store.failAi(game, 'The computer could not finish this turn. You can play it yourself.'); };
    // Give turn changes time to paint, and make computer-vs-computer play readable.
    const timer = setTimeout(() => {
      try {
        worker = new Worker(new URL('./ai/worker.ts', import.meta.url), { type: 'module' });
        worker.onmessage = (event: MessageEvent<{ move: Move | null; error?: string }>) => {
          clearTimeout(timeout);
          worker?.terminate();
          if (!active) return;
          if (event.data.error) store.failAi(game, event.data.error);
          else store.acceptAiMove(game, event.data.move);
        };
        worker.onerror = fail;
        timeout = setTimeout(() => { worker?.terminate(); fail(); }, 10000);
        worker.postMessage(game);
      } catch { fail(); }
    }, 450);
    return () => { active = false; clearTimeout(timer); clearTimeout(timeout); worker?.terminate(); };
  }, [game, ai1, ai2, menu]);
  const resultOpen = game.status === 'finished' && dismissedResult !== game && menu === null;
  return <div className="app">
    <header className="app-header"><div className="brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Cut the Plane<span className="brand-period">.</span><small>A GAME OF LINES & LIMITS</small></span></div><nav aria-label="Main menu"><button className="text-button help-button" onClick={() => setMenu('help')}>How to play <span className="help-circle">?</span></button><button className="primary" onClick={() => setMenu('settings')}>New game <span aria-hidden="true">↗</span></button></nav></header>
    <main><div className="page-heading"><div><span className="eyebrow">A LITTLE GEOMETRY. A LOT OF STRATEGY.</span><h1>Make your next cut count.</h1></div><span className="local-badge"><span />LOCAL PLAY</span></div><div className="app-main"><GameBoard key={round} /><Hud onSettings={() => setMenu('settings')} /></div></main>
    <footer className="app-footer"><span>One plane. Endless possibilities.</span><a href="https://github.com/shizuo-kaji/CutThePlane" target="_blank" rel="noreferrer">About the project ↗</a></footer>
    <HelpModal open={menu === 'help'} onClose={() => setMenu(null)} />
    {menu === 'settings' && <Controls onClose={() => setMenu(null)} />}
    <GameOverModal open={resultOpen} game={game} onClose={() => setDismissedResult(game)} onRestart={() => start()} onSettings={() => { setDismissedResult(game); setMenu('settings'); }} />
  </div>;
}
export default App;
