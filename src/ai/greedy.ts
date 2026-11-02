import { applyMove, candidateMoves } from '../core';
import type { GameState, Move, PlayerIndex } from '../core';

const WIN = 1_000_000;
const BRANCHES = 12;
export interface AiDecision { move: Move; nextState: GameState; score: number }

function evaluate(state: GameState, player: PlayerIndex): number {
  if (state.status === 'finished') return state.winner === null ? 0 : state.winner === player ? WIN - state.moveNumber : -WIN + state.moveNumber;
  const headroom = state.config.targetRooms - state.rooms;
  return (state.config.rule === 'avoidance' ? headroom : -headroom) * (state.turn === player ? -1 : 1);
}

function candidates(state: GameState): AiDecision[] {
  const result: AiDecision[] = [];
  for (const move of candidateMoves(state.config)) {
    const outcome = applyMove(state, move, false);
    if (outcome.error) continue;
    const nextState = outcome.state;
    const score = nextState.status === 'finished' ? evaluate(nextState, state.turn)
      : state.config.rule === 'race' ? nextState.rooms : -nextState.rooms;
    // Do not let pruning remove an immediate winning move.
    if (nextState.winner === state.turn) return [{ move, nextState, score }];
    result.push({ move, nextState, score });
  }
  return result.sort((a, b) => b.score - a.score).slice(0, BRANCHES);
}

function search(state: GameState, depth: number, alpha: number, beta: number, player: PlayerIndex, deadline: number): number {
  if (state.status === 'finished' || depth === 0 || Date.now() >= deadline) return evaluate(state, player);
  const moves = candidates(state);
  if (!moves.length) return 0; // Finite-lattice exhaustion is a draw, for either kind of player.
  const maximizing = state.turn === player;
  let best = maximizing ? -Infinity : Infinity;
  for (const move of moves) {
    const value = search(move.nextState, depth - 1, alpha, beta, player, deadline);
    best = maximizing ? Math.max(best, value) : Math.min(best, value);
    if (maximizing) alpha = Math.max(alpha, best); else beta = Math.min(beta, best);
    if (beta <= alpha || Date.now() >= deadline) break;
  }
  return best;
}

export function chooseAlphaBetaMove(state: GameState, depth = 3): AiDecision | null {
  if (state.status !== 'playing') return null;
  const deadline = Date.now() + 700;
  const moves = candidates(state);
  let best: AiDecision | null = null;
  for (const candidate of moves) {
    const score = search(candidate.nextState, depth - 1, -Infinity, Infinity, state.turn, deadline);
    if (!best || score > best.score) best = { ...candidate, score };
    if (Date.now() >= deadline) break;
  }
  return best;
}

export function chooseGreedyMove(state: GameState): AiDecision | null {
  return state.status === 'playing' ? candidates(state)[0] ?? null : null;
}

export const chooseBestMove = chooseAlphaBetaMove;
