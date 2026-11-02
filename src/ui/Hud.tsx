import { directionKey, directionUsage } from '../core';
import { useGameStore } from '../hooks/useGameStore';
import { DirectionIcon, directionLabel } from './DirectionIcon';

export function Hud({ onSettings }: { onSettings(): void }) {
  const game = useGameStore((s) => s.game);
  const aiPlayers = useGameStore((s) => s.aiPlayers);
  const thinking = useGameStore((s) => s.aiThinking);
  const setAiPlayer = useGameStore((s) => s.setAiPlayer);
  const { config } = game;
  const remaining = Math.max(0, config.targetRooms - game.rooms);
  const status = game.status === 'finished' ? game.winner === null ? 'Draw' : `Player ${game.winner + 1} wins` : `Player ${game.turn + 1}${thinking ? ' is thinking…' : ' to move'}`;
  return <aside className="side-panel">
    <section className="score-panel" aria-label="Score">
      <div className="section-kicker"><span>THE ROOM COUNT</span><span className="mode-pill">{config.rule === 'race' ? 'RACE' : 'AVOIDANCE'}</span></div>
      <div className="score-line" aria-live="polite" aria-atomic="true"><strong key={game.rooms} className="score-number">{game.rooms}</strong><span>/ {config.targetRooms}<small>rooms</small></span></div>
      <div className="progress-track" role="progressbar" aria-label="Rooms toward target" aria-valuenow={game.rooms} aria-valuemin={0} aria-valuemax={Math.max(game.rooms, config.targetRooms)}><span style={{ width: `${Math.min(100, game.rooms / config.targetRooms * 100)}%` }} /></div>
      <p className="score-caption">{config.rule === 'race' ? 'Be the first to reach' : 'Stay below'} <strong>{config.targetRooms}</strong>. {remaining > 0 ? `${remaining} to go.` : 'Target reached.'}</p>
    </section>
    <section className="players-section" aria-label="Players">
      <div className="section-kicker"><span aria-live="polite">{status}</span><span>MOVE {game.moveNumber}</span></div>
      <div className="player-panel">{([0, 1] as const).map((player) => <div key={player} className={`player-card player-${player}${game.status === 'playing' && game.turn === player ? ' is-current' : ''}`}>
        <div className="player-name"><span className="player-dot" />Player {player + 1}{game.winner === player && <span aria-label="Winner">★</span>}</div>
        <select aria-label={`Player ${player + 1} control`} value={aiPlayers[player] ? 'computer' : 'human'} onChange={(e) => setAiPlayer(player, e.target.value === 'computer')}><option value="human">Human</option><option value="computer">Computer</option></select>
      </div>)}</div>
    </section>
    <section className="rules-panel" aria-label="Current rules">
      <div className="section-kicker"><span>YOUR RULES</span><button className="text-button" onClick={onSettings}>Change ↗</button></div>
      <dl className="rule-summary"><div><dt>Count</dt><dd>{config.scoring === 'board' ? 'Inside the board' : 'The whole plane'}</dd></div><div><dt>Triple points</dt><dd>{config.allowTriplePoints ? 'Allowed' : 'Not allowed'}</dd></div><div><dt>Capacity</dt><dd>{config.capacities ? 'Limited per direction' : 'Unlimited'}</dd></div></dl>
      <div className="direction-summary" aria-label="Direction usage">{config.directions.map((d) => <div className="direction-stat" key={directionKey(d)} title={directionLabel(d)}><DirectionIcon direction={d} /><span>{directionUsage(game, d)}<small> / {config.capacities?.[directionKey(d)] ?? '∞'}</small></span></div>)}</div>
      <p className="field-note">Lines used per direction · shared by both players</p>
    </section>
    <div className="strategy-note"><span aria-hidden="true">✳</span><p>{config.rule === 'race' ? 'Intersections create more rooms. Find the line that gets you there first.' : 'One line can change everything. Preview your next cut before you commit.'}</p></div>
  </aside>;
}
