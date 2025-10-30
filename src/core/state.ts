import type {
  Direction,
  GameConfig,
  GameState,
  Line,
  Move,
  MoveError,
  MoveOutcome,
  PlayerIndex,
  Point,
} from './types';
import {
  createLineFromPoints,
  directionsEqual,
  lineKey,
  normalizeDirection,
} from '../geom/lines';
import { countRooms } from './counting';
import { clipLineToBox, lineMatchesBoundary } from '../geom/clipping';

const DEFAULT_SIZE = 11;
const DEFAULT_TARGET_ROOMS = 20;
const DEFAULT_DIRECTIONS: Direction[] = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
  { dx: 1, dy: -1 },
];

function canonicalDirections(directions: Direction[]): Direction[] {
  const seen = new Set<string>();
  const result: Direction[] = [];
  for (const dir of directions) {
    const norm = normalizeDirection(dir.dx, dir.dy);
    const key = `${norm.dx},${norm.dy}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(norm);
  }
  return result;
}

export function createInitialState(config?: Partial<GameConfig>): GameState {
  const size = config?.size ?? DEFAULT_SIZE;
  const targetRooms = config?.targetRooms ?? DEFAULT_TARGET_ROOMS;
  const directions = canonicalDirections(
    config?.directions ?? DEFAULT_DIRECTIONS,
  );
  const state: GameState = {
    config: {
      size,
      targetRooms,
      directions,
    },
    lines: [],
    rooms: 1,
    turn: 0,
    moveNumber: 0,
    status: 'playing',
    loser: null,
  };
  return state;
}

export function applyMove(state: GameState, move: Move): MoveOutcome {
  const validation = validateMove(state, move);
  if (validation) {
    return { state, error: validation };
  }

  const line = createLineFromPoints(move.a, move.b);
  const extended = clipLineToBox(line, state.config.size);
  if (!extended) {
    return {
      state,
      error: {
        code: 'line_out_of_bounds',
        message: 'The proposed line does not intersect the board.',
      },
    };
  }

  const lines = [...state.lines, line];
  const rooms = countRooms(state.config.size, lines);
  const nextTurn: PlayerIndex = state.turn === 0 ? 1 : 0;

  const nextState: GameState = {
    ...state,
    lines,
    rooms,
    moveNumber: state.moveNumber + 1,
    turn: nextTurn,
  };

  if (rooms >= state.config.targetRooms) {
    nextState.status = 'finished';
    nextState.loser = state.turn;
  }

  return { state: nextState };
}

function validateMove(state: GameState, move: Move): MoveError | undefined {
  if (state.status === 'finished') {
    return {
      code: 'game_finished',
      message: 'The game is already finished.',
    };
  }

  if (!pointsDistinct(move.a, move.b)) {
    return {
      code: 'points_equal',
      message: 'Select two distinct lattice points.',
    };
  }

  if (!pointInBounds(move.a, state.config.size) || !pointInBounds(move.b, state.config.size)) {
    return {
      code: 'line_out_of_bounds',
      message: 'Points must lie within the board.',
    };
  }

  if (!isLatticePoint(move.a) || !isLatticePoint(move.b)) {
    return {
      code: 'line_out_of_bounds',
      message: 'Points must be lattice coordinates.',
    };
  }

  let line: Line;
  try {
    line = createLineFromPoints(move.a, move.b);
  } catch (error) {
    return {
      code: 'line_out_of_bounds',
      message: error instanceof Error ? error.message : 'Invalid line.',
    };
  }

  if (!directionAllowed(line.direction, state.config.directions)) {
    return {
      code: 'direction_not_allowed',
      message: 'That direction is not allowed in the current ruleset.',
    };
  }

  if (state.lines.some((existing) => lineKey(existing) === lineKey(line))) {
    return {
      code: 'duplicate_line',
      message: 'That line already exists on the board.',
    };
  }

  if (lineMatchesBoundary(line, state.config.size)) {
    return {
      code: 'line_matches_boundary',
      message: 'Lines must not coincide with the board boundary.',
    };
  }

  return undefined;
}

function directionAllowed(direction: Direction, allowed: Direction[]): boolean {
  return allowed.some((dir) => directionsEqual(dir, direction));
}

function pointInBounds(point: Point, size: number): boolean {
  return (
    point.x >= 0 &&
    point.x <= size &&
    point.y >= 0 &&
    point.y <= size
  );
}

function isLatticePoint(point: Point): boolean {
  return Number.isInteger(point.x) && Number.isInteger(point.y);
}

function pointsDistinct(a: Point, b: Point): boolean {
  return a.x !== b.x || a.y !== b.y;
}
