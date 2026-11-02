import type { GameState } from '../core';
import { Modal } from './Modal';

export function GameOverModal({ open, game, onClose, onRestart, onSettings }: {
  open: boolean; game: GameState; onClose(): void; onRestart(): void; onSettings(): void;
}) {
  const draw = game.winner === null;
  return <Modal open={open} title={draw ? 'A game well drawn.' : `Player ${game.winner! + 1} wins!`} onClose={onClose}>
    <div className="modal-body result-body"><div className="result-score">{game.rooms}<span> / {game.config.targetRooms} rooms</span></div>
      <p>{game.endReason === 'capacity' ? 'All direction capacities were used before the target was reached. It’s a draw.' : game.endReason === 'no_moves' ? 'No legal lattice lines remain below the target. It’s a draw.' : game.config.rule === 'race' ? `Player ${game.winner! + 1} reached the target first.` : `Player ${game.loser! + 1} reached or exceeded the target.`}</p>
      <p className="muted">{game.moveNumber} move{game.moveNumber === 1 ? '' : 's'} · {game.config.rule === 'race' ? 'Race' : 'Avoidance'} · {game.config.scoring === 'plane' ? 'Whole plane' : 'Board only'}</p>
      <button className="text-button" onClick={onClose}>Keep exploring the final board ↗</button>
    </div><footer className="modal-footer"><button className="secondary" onClick={onSettings}>Change rules</button><button className="primary" onClick={onRestart}>Play again ↗</button></footer>
  </Modal>;
}
