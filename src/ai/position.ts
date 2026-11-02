import { candidateMoves, directionKey } from '../core/candidates';
import type { GameState, Line, Move, PlayerIndex } from '../core/types';
import { createLineFromPoints, lineKey } from '../geom/lines';
import { intersectLines, intersectionKey } from '../geom/intersections';
import { clipLineToBox, lineMatchesBoundary } from '../geom/clipping';

export interface SearchPosition {
  played: number[];
  counts: number[];
  rooms: number;
  turn: PlayerIndex;
  /** Undefined means play continues; null is a draw. */
  winner: PlayerIndex | null | undefined;
}

interface Candidate {
  move: Move;
  line: Line;
  direction: number;
  offset: number;
  shape: number;
}

interface Crossing { key: string; inside: boolean; distance: number }
export interface SearchMove {
  id: number;
  direction: number;
  gain: number;
  style: number;
  outcome: 'play' | 'win' | 'loss' | 'draw';
}
export interface PositionAnalysis {
  moves: SearchMove[];
  sensible: SearchMove[];
  /** An outcome known from all legal moves, not from the pruned search. */
  forced: PlayerIndex | null | undefined;
}

const EPS = 1e-9;
const clamp = (n: number) => Math.max(0, Math.min(1, n));

/** Shared geometry for one search. Descendants only change the selected line IDs. */
export class PositionModel {
  readonly candidates: Candidate[];
  readonly initial: SearchPosition;
  readonly capacities: number[];
  private readonly game: GameState;
  private readonly crossings = new Map<number, Crossing | null>();

  constructor(game: GameState) {
    this.game = game;
    const { size, scoring, directions } = game.config;
    this.capacities = directions.map((d) => game.config.capacities?.[directionKey(d)] ?? Infinity);
    this.candidates = candidateMoves(game.config).flatMap((move) => {
      const line = createLineFromPoints(move.a, move.b);
      if (scoring === 'board' && lineMatchesBoundary(line, size)) return [];
      const norm = Math.hypot(line.direction.dx, line.direction.dy);
      const distance = Math.abs((-line.direction.dy + line.direction.dx) * size / 2 + line.c) / norm;
      const segment = clipLineToBox(line, size);
      const length = segment ? Math.hypot(segment.a.x - segment.b.x, segment.a.y - segment.b.y) / size : 0;
      const centrality = Math.exp(-Math.pow(distance / (size * 0.32), 2));
      return [{ move, line, direction: directions.findIndex((d) => directionKey(d) === directionKey(line.direction)),
        offset: line.c / norm, shape: 0.65 * centrality + 0.35 * clamp(length) }];
    });
    const ids = new Map(this.candidates.map((candidate, id) => [lineKey(candidate.line), id]));
    const played = game.lines.map((line) => {
      const id = ids.get(lineKey(line));
      if (id === undefined) throw new Error('Position contains a line outside the playable grid.');
      return id;
    });
    const counts = directions.map(() => 0);
    played.forEach((id) => counts[this.candidates[id].direction]++);
    this.initial = { played, counts, rooms: game.rooms, turn: game.turn,
      winner: game.status === 'finished' ? game.winner : undefined };
  }

  private crossing(a: number, b: number): Crossing | null {
    const id = Math.min(a, b) * this.candidates.length + Math.max(a, b);
    if (this.crossings.has(id)) return this.crossings.get(id)!;
    const first = this.candidates[a].line, second = this.candidates[b].line;
    const key = intersectionKey(first, second);
    let hit: Crossing | null = null;
    if (key !== null) {
      const p = intersectLines(first, second)!;
      const size = this.game.config.size;
      hit = { key, inside: p.x > EPS && p.y > EPS && p.x < size - EPS && p.y < size - EPS,
        distance: Math.max(0, -p.x, -p.y, p.x - size, p.y - size) / size };
    }
    // Large custom boards must not turn the worker into an unbounded geometry cache.
    if (this.crossings.size < 120_000) this.crossings.set(id, hit);
    return hit;
  }

  analyze(position: SearchPosition, checkBudget: () => void = () => {}): PositionAnalysis {
    if (position.winner !== undefined) return { moves: [], sensible: [], forced: position.winner };
    const used = new Set(position.played);
    const moves: SearchMove[] = [];
    const { size, scoring, allowTriplePoints, targetRooms, rule } = this.game.config;
    for (let id = 0; id < this.candidates.length; id++) {
      if (id % 32 === 0) checkBudget();
      const candidate = this.candidates[id];
      if (used.has(id) || position.counts[candidate.direction] >= this.capacities[candidate.direction]) continue;
      const allHits = new Set<string>(), roomHits = new Set<string>();
      let legal = true, spacing = size * 0.15, farthest = 0;
      for (const other of position.played) {
        const hit = this.crossing(id, other);
        if (!hit) {
          spacing = Math.min(spacing, Math.abs(candidate.offset - this.candidates[other].offset));
          continue;
        }
        if (!allowTriplePoints && allHits.has(hit.key)) { legal = false; break; }
        allHits.add(hit.key);
        if (scoring === 'plane' || hit.inside) roomHits.add(hit.key);
        farthest = Math.max(farthest, hit.distance);
      }
      if (!legal) continue;
      const gain = 1 + roomHits.size;
      let outcome: SearchMove['outcome'] = 'play';
      if (position.rooms + gain >= targetRooms) outcome = rule === 'race' ? 'win' : 'loss';
      else if (this.capacities.every((cap, d) => position.counts[d] + Number(d === candidate.direction) >= cap)) outcome = 'draw';
      // Preferences apply among plausible moves, never before a known win/loss check.
      const style = clamp(0.7 * candidate.shape + 0.25 * clamp(spacing / (size * 0.15))
        + (position.counts[candidate.direction] === 0 ? 0.05 : 0) - Math.min(0.3, farthest * 0.08));
      moves.push({ id, direction: candidate.direction, gain, outcome, style });
    }
    const wins = moves.filter((move) => move.outcome === 'win');
    const safe = moves.filter((move) => move.outcome !== 'loss');
    const forced = !moves.length ? null : wins.length ? position.turn : !safe.length ? (1 - position.turn) as PlayerIndex
      : safe.every((move) => move.outcome === 'draw') ? null : undefined;
    return { moves, sensible: wins.length ? wins : safe.length ? safe : moves, forced };
  }

  advance(position: SearchPosition, move: SearchMove): SearchPosition {
    const counts = [...position.counts]; counts[move.direction]++;
    return { played: [...position.played, move.id], counts, rooms: position.rooms + move.gain,
      turn: (1 - position.turn) as PlayerIndex,
      winner: move.outcome === 'play' ? undefined : move.outcome === 'draw' ? null
        : move.outcome === 'win' ? position.turn : (1 - position.turn) as PlayerIndex };
  }
}
