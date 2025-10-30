import { applyMove } from '../core';
import type { GameState, Move, PlayerIndex, Point } from '../core';
import { createLineFromPoints, lineKey } from '../geom';

const WIN_SCORE = 1_000_000;
const LOSS_SCORE = -1_000_000;
const MAX_BRANCHING_FACTOR = 14;

export interface AiDecision {
  move: Move;
  nextState: GameState;
  score: number;
}

interface Candidate {
  move: Move;
  nextState: GameState;
  heuristic: number;
}

function pointInBounds(point: Point, size: number): boolean {
  return (
    point.x >= 0 &&
    point.x <= size &&
    point.y >= 0 &&
    point.y <= size
  );
}

function evaluate(state: GameState, maximizingPlayer: PlayerIndex): number {
  if (state.status === 'finished') {
    return state.loser === maximizingPlayer
      ? LOSS_SCORE + state.rooms
      : WIN_SCORE - state.rooms;
  }
  return state.config.targetRooms - state.rooms;
}

function generateCandidates(state: GameState): Candidate[] {
  const size = state.config.size;
  const existing = new Set(state.lines.map((line) => lineKey(line)));
  const seen = new Set<string>();
  const candidates: Candidate[] = [];

  for (let x = 0; x <= size; x += 1) {
    for (let y = 0; y <= size; y += 1) {
      const anchor: Point = { x, y };
      for (const direction of state.config.directions) {
        const b: Point = { x: anchor.x + direction.dx, y: anchor.y + direction.dy };
        if (!pointInBounds(b, size)) {
          continue;
        }
        let key: string;
        try {
          key = lineKey(createLineFromPoints(anchor, b));
        } catch {
          continue;
        }
        if (existing.has(key) || seen.has(key)) {
          continue;
        }
        seen.add(key);

        const move: Move = { a: anchor, b };
        const outcome = applyMove(state, move);
        if (outcome.error) {
          continue;
        }
        const heuristic = outcome.state.config.targetRooms - outcome.state.rooms;
        candidates.push({
          move,
          nextState: outcome.state,
          heuristic,
        });
      }
    }
  }

  candidates.sort((a, b) => b.heuristic - a.heuristic);
  if (candidates.length > MAX_BRANCHING_FACTOR) {
    return candidates.slice(0, MAX_BRANCHING_FACTOR);
  }
  return candidates;
}

function alphaBeta(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizingPlayer: PlayerIndex,
): number {
  if (depth <= 0 || state.status === 'finished') {
    return evaluate(state, maximizingPlayer);
  }

  const candidates = generateCandidates(state);
  if (candidates.length === 0) {
    return state.turn === maximizingPlayer ? LOSS_SCORE : WIN_SCORE;
  }

  if (state.turn === maximizingPlayer) {
    let value = LOSS_SCORE;
    for (const candidate of candidates) {
      const score = alphaBeta(candidate.nextState, depth - 1, alpha, beta, maximizingPlayer);
      value = Math.max(value, score);
      alpha = Math.max(alpha, value);
      if (alpha >= beta) {
        break;
      }
    }
    return value;
  }

  let value = WIN_SCORE;
  for (const candidate of candidates) {
    const score = alphaBeta(candidate.nextState, depth - 1, alpha, beta, maximizingPlayer);
    value = Math.min(value, score);
    beta = Math.min(beta, value);
    if (alpha >= beta) {
      break;
    }
  }
  return value;
}

export function chooseGreedyMove(state: GameState): AiDecision | null {
  const candidates = generateCandidates(state);
  if (candidates.length === 0) {
    return null;
  }
  const best = candidates.reduce<Candidate[]>((acc, candidate) => {
    if (acc.length === 0 || candidate.heuristic === acc[0].heuristic) {
      acc.push(candidate);
    } else if (candidate.heuristic > acc[0].heuristic) {
      acc.splice(0, acc.length, candidate);
    }
    return acc;
  }, []);
  const pick = best[Math.floor(Math.random() * best.length)] ?? candidates[0];
  return {
    move: pick.move,
    nextState: pick.nextState,
    score: pick.heuristic,
  };
}

export function chooseAlphaBetaMove(state: GameState, depth = 3): AiDecision | null {
  if (state.status !== 'playing') {
    return null;
  }
  const candidates = generateCandidates(state);
  if (candidates.length === 0) {
    return null;
  }

  const maximizingPlayer = state.turn;
  let alpha = LOSS_SCORE;
  let beta = WIN_SCORE;
  let bestScore = LOSS_SCORE;
  const bestCandidates: AiDecision[] = [];

  for (const candidate of candidates) {
    const score = alphaBeta(candidate.nextState, depth - 1, alpha, beta, maximizingPlayer);
    if (score > bestScore) {
      bestScore = score;
      bestCandidates.length = 0;
      bestCandidates.push({
        move: candidate.move,
        nextState: candidate.nextState,
        score,
      });
    } else if (score === bestScore) {
      bestCandidates.push({
        move: candidate.move,
        nextState: candidate.nextState,
        score,
      });
    }
    alpha = Math.max(alpha, score);
    if (alpha >= beta) {
      break;
    }
  }

  if (bestCandidates.length === 0) {
    return {
      move: candidates[0].move,
      nextState: candidates[0].nextState,
      score: evaluate(candidates[0].nextState, maximizingPlayer),
    };
  }
  return bestCandidates[Math.floor(Math.random() * bestCandidates.length)];
}

export function chooseBestMove(state: GameState): AiDecision | null {
  return chooseAlphaBetaMove(state) ?? chooseGreedyMove(state);
}
