import type { Direction, GameConfig, GameState, Line, Move, MoveError, MoveOutcome, Point } from './types';
import { createLineFromPoints, directionsEqual, lineKey, normalizeDirection } from '../geom/lines';
import { intersectionKey } from '../geom/intersections';
import { lineMatchesBoundary } from '../geom/clipping';
import { addedRooms } from './counting';
import { candidateMoves, directionKey } from './candidates';

export const DEFAULT_DIRECTIONS: Direction[] = [
  { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 1, dy: 1 }, { dx: 1, dy: -1 },
];

export function canonicalDirections(directions: Direction[]): Direction[] {
  const result: Direction[] = [];
  for (const dir of directions) {
    if (!Number.isSafeInteger(dir.dx) || !Number.isSafeInteger(dir.dy) || (dir.dx === 0 && dir.dy === 0)) {
      throw new Error('Directions must be nonzero integer vectors.');
    }
    const norm = normalizeDirection(dir.dx, dir.dy);
    if (!result.some((d) => directionsEqual(d, norm))) result.push(norm);
  }
  return result;
}

export function createInitialState(options?: Partial<GameConfig>): GameState {
  const size = options?.size ?? 11;
  const targetRooms = options?.targetRooms ?? 20;
  const directions = canonicalDirections(options?.directions ?? DEFAULT_DIRECTIONS);
  if (!Number.isInteger(size) || size < 2 || size > 61) throw new Error('Board size must be an integer from 2 to 61.');
  if (!Number.isInteger(targetRooms) || targetRooms < 2 || targetRooms > 10000) throw new Error('The target must be an integer from 2 to 10,000.');
  if (!directions.length || directions.length > 8 || directions.some((d) => Math.max(Math.abs(d.dx), Math.abs(d.dy)) > size)) {
    throw new Error('Choose 1–8 directions that fit the board.');
  }
  const capacities = options?.capacities ? { ...options.capacities } : null;
  if (capacities && Object.values(capacities).some((n) => !Number.isInteger(n) || n < 0 || n > 1000)) {
    throw new Error('Capacities must be integers from 0 to 1,000.');
  }
  const config: GameConfig = {
    size, targetRooms, directions, capacities,
    scoring: options?.scoring ?? 'board',
    rule: options?.rule ?? 'avoidance',
    allowTriplePoints: options?.allowTriplePoints ?? true,
  };
  return settleAvailability({ config, lines: [], rooms: 1, turn: 0, moveNumber: 0, status: 'playing', loser: null, winner: null, endReason: null });
}

export function directionUsage(state: GameState, direction: Direction): number {
  return state.lines.filter((line) => directionsEqual(line.direction, direction)).length;
}

export function capacityExhausted(state: GameState): boolean {
  return state.config.directions.every((d) => directionUsage(state, d) >= (state.config.capacities?.[directionKey(d)] ?? Infinity));
}

export function hasLegalMove(state: GameState): boolean {
  return state.status === 'playing' && candidateMoves(state.config).some((move) => !validateMove(state, move));
}

export function settleAvailability(state: GameState): GameState {
  if (state.status !== 'playing') return state;
  const endReason = capacityExhausted(state) ? 'capacity' : !hasLegalMove(state) ? 'no_moves' : null;
  return endReason ? { ...state, status: 'finished', endReason, winner: null, loser: null } : state;
}

/** Preview and search can omit the finite-lattice exhaustion scan; committed moves always run it. */
export function applyMove(state: GameState, move: Move, checkAvailability = true): MoveOutcome {
  const error = validateMove(state, move);
  if (error) return { state, error };
  const line = createLineFromPoints(move.a, move.b);
  const rooms = state.rooms + addedRooms(state.config, state.lines, line);
  const next: GameState = {
    ...state, lines: [...state.lines, line], rooms,
    moveNumber: state.moveNumber + 1, turn: state.turn === 0 ? 1 : 0,
  };
  if (rooms >= state.config.targetRooms) {
    const winner = state.config.rule === 'race' ? state.turn : next.turn;
    return { state: { ...next, status: 'finished', winner, loser: winner === 0 ? 1 : 0, endReason: 'threshold' } };
  }
  if (capacityExhausted(next)) return { state: { ...next, status: 'finished', endReason: 'capacity' } };
  return { state: checkAvailability ? settleAvailability(next) : next };
}

export function validateMove(state: GameState, move: Move): MoveError | undefined {
  if (state.status === 'finished') return { code: 'game_finished', message: 'This game is finished. Start a new game to play again.' };
  if (move.a.x === move.b.x && move.a.y === move.b.y) return { code: 'points_equal', message: 'Choose a different second point.' };
  if (![move.a, move.b].every((p) => isBoardPoint(p, state.config.size))) {
    return { code: 'line_out_of_bounds', message: 'Choose lattice points inside the original board.' };
  }
  const line: Line = createLineFromPoints(move.a, move.b);
  if (!state.config.directions.some((d) => directionsEqual(d, line.direction))) {
    return { code: 'direction_not_allowed', message: 'This direction is not allowed. Try one of the direction buttons.' };
  }
  if (state.lines.some((other) => lineKey(other) === lineKey(line))) return { code: 'duplicate_line', message: 'That line has already been drawn.' };
  if (directionUsage(state, line.direction) >= (state.config.capacities?.[directionKey(line.direction)] ?? Infinity)) {
    return { code: 'capacity_reached', message: 'This direction has used all of its capacity.' };
  }
  if (state.config.scoring === 'board' && lineMatchesBoundary(line, state.config.size)) {
    return { code: 'line_matches_boundary', message: 'A boundary line does not split the board. Choose an interior line.' };
  }
  if (!state.config.allowTriplePoints) {
    const hits = new Set<string>();
    for (const other of state.lines) {
      const key = intersectionKey(line, other);
      if (key === null) continue;
      if (hits.has(key)) return { code: 'triple_point', message: 'Three or more lines would meet at one point (possibly outside the board).' };
      hits.add(key);
    }
  }
  return undefined;
}

export function isBoardPoint(point: Point, size: number): boolean {
  return Number.isInteger(point.x) && Number.isInteger(point.y) && point.x >= 0 && point.x <= size && point.y >= 0 && point.y <= size;
}
