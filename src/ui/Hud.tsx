import { useGameStore } from '../hooks/useGameStore';

export function Hud() {
  const game = useGameStore((state) => state.game);
  const message = useGameStore((state) => state.message);

  const statusLine =
    game.status === 'finished'
      ? `Player ${game.loser !== null ? game.loser + 1 : '?'} loses`
      : `Player ${game.turn + 1} to move`;

  return (
    <section className="hud">
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
