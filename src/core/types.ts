export interface Point {
  x: number;
  y: number;
}

export interface Direction {
  dx: number;
  dy: number;
}

export interface Line {
  direction: Direction;
  /** Anchor lattice point chosen when the line was created. */
  anchor: Point;
  /** Constant term for the line's implicit equation n·p + c = 0. */
  c: number;
}

export type PlayerIndex = 0 | 1;

export interface GameConfig {
  size: number;
  directions: Direction[];
  targetRooms: number;
  scoring: 'board' | 'plane';
  rule: 'avoidance' | 'race';
  allowTriplePoints: boolean;
  /** Shared by both players; omitted direction keys have unlimited capacity. */
  capacities: Record<string, number> | null;
}

export interface GameState {
  config: GameConfig;
  lines: Line[];
  rooms: number;
  turn: PlayerIndex;
  moveNumber: number;
  status: 'playing' | 'finished';
  loser: PlayerIndex | null;
  winner: PlayerIndex | null;
  endReason: 'threshold' | 'capacity' | 'no_moves' | null;
}

export interface Move {
  a: Point;
  b: Point;
}

export interface MoveOutcome {
  state: GameState;
  error?: MoveError;
}

export interface MoveError {
  code:
    | 'points_equal'
    | 'direction_not_allowed'
    | 'duplicate_line'
    | 'line_out_of_bounds'
    | 'line_matches_boundary'
    | 'triple_point'
    | 'capacity_reached'
    | 'game_finished';
  message: string;
}
