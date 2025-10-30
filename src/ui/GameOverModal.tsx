import type { MouseEventHandler } from 'react';
import type { PlayerIndex } from '../core/types';

interface GameOverModalProps {
  open: boolean;
  loser: PlayerIndex | null;
  rooms: number;
  target: number;
  onRestart(): void;
  onClose(): void;
}

export function GameOverModal({ open, loser, rooms, target, onRestart, onClose }: GameOverModalProps) {
  if (!open) {
    return null;
  }

  const handleBackdropClick: MouseEventHandler<HTMLDivElement> = (event) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const loserLabel = loser !== null ? `Player ${loser + 1}` : 'The active player';
  const winnerLabel = loser !== null ? `Player ${loser === 0 ? 2 : 1}` : 'The opponent';

  return (
    <div className="modal-backdrop" role="presentation" onClick={handleBackdropClick}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="gameover-modal-title"
        aria-describedby="gameover-modal-content"
      >
        <header className="modal-header">
          <h2 id="gameover-modal-title">Game Over</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close game over dialog">
            ×
          </button>
        </header>
        <section id="gameover-modal-content" className="modal-body">
          <p>{loserLabel} exceeded the room limit.</p>
          <p>
            Room count: <strong>{rooms}</strong> / <strong>{target}</strong>
          </p>
          {loser !== null ? <p>{winnerLabel} wins the match.</p> : null}
        </section>
        <footer className="modal-footer">
          <button type="button" className="secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="primary" onClick={onRestart}>
            Play again
          </button>
        </footer>
      </div>
    </div>
  );
}
