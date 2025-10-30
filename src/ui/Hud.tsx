import { useGameStore } from '../hooks/useGameStore';
import type { GameState, PlayerIndex } from '../core';

export function Hud() {
  const game = useGameStore((state) => state.game);
  const message = useGameStore((state) => state.message);
  const aiPlayers = useGameStore((state) => state.aiPlayers);
  const setAiPlayer = useGameStore((state) => state.setAiPlayer);

  const statusLine =
    game.status === 'finished'
      ? `Player ${game.loser !== null ? game.loser + 1 : '?'} loses`
      : `Player ${game.turn + 1} to move`;

  return (
    <section className="hud">
      <PlayerPanel
        current={game.turn}
        status={game.status}
        loser={game.loser}
        aiPlayers={aiPlayers}
        onToggle={setAiPlayer}
      />
      <div className="hud-row">
        <div>
          <span className="hud-label">Rooms</span>
          <span className="hud-value">
            {game.rooms} / {game.config.targetRooms}
          </span>
        </div>
        <div>
          <span className="hud-label">Move</span>
          <span className="hud-value">{game.moveNumber}</span>
        </div>
        <div>
          <span className="hud-label">Status</span>
          <span className="hud-value">{statusLine}</span>
        </div>
      </div>
      {message ? <p className="hud-message">{message}</p> : null}
      {game.status === 'finished' ? (
        <p className="hud-message success">Game over — start a new match to keep playing.</p>
      ) : null}
    </section>
  );
}

interface PlayerPanelProps {
  current: PlayerIndex;
  status: GameState['status'];
  loser: PlayerIndex | null;
  aiPlayers: [boolean, boolean];
  onToggle(player: PlayerIndex, enabled: boolean): void;
}

function PlayerPanel({ current, status, loser, aiPlayers, onToggle }: PlayerPanelProps) {
  const players: PlayerIndex[] = [0, 1];
  return (
    <div className="player-panel" role="group" aria-label="Players">
      {players.map((player) => {
        const isCurrent = status === 'playing' && current === player;
        const isLoser = status === 'finished' && loser === player;
        return (
          <div
            key={player}
            className={`player-card${isCurrent ? ' is-current' : ''}${isLoser ? ' is-loser' : ''}`}
          >
            <div className="player-card-header">
              <span className="player-name">Player {player + 1}</span>
              {isCurrent ? <span className="player-badge">Current</span> : null}
              {isLoser ? <span className="player-badge loser">Loser</span> : null}
            </div>
            <label className="player-ai-toggle">
              <input
                type="checkbox"
                checked={aiPlayers[player]}
                onChange={(event) => onToggle(player, event.target.checked)}
              />
              AI
            </label>
          </div>
        );
      })}
    </div>
  );
}
