import type { Direction, GameConfig, Move, Point } from './types';
import { createLineFromPoints, lineKey } from '../geom/lines';

export const directionKey = (d: Direction) => `${d.dx},${d.dy}`;

export function moveFromAnchor(anchor: Point, direction: Direction, size: number): Move | null {
  for (const sign of [1, -1]) {
    const b = { x: anchor.x + sign * direction.dx, y: anchor.y + sign * direction.dy };
    if (b.x >= 0 && b.x <= size && b.y >= 0 && b.y <= size) return { a: anchor, b };
  }
  return null;
}

const cache = new Map<string, Move[]>();

/** All distinct lines selectable using two lattice points in the original board. */
export function candidateMoves(config: GameConfig): Move[] {
  const key = `${config.size}:${config.directions.map(directionKey).join(';')}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const seen = new Set<string>();
  const result: Move[] = [];
  for (const direction of config.directions) {
    for (let x = 0; x <= config.size; x++) {
      for (let y = 0; y <= config.size; y++) {
        const move = moveFromAnchor({ x, y }, direction, config.size);
        if (!move) continue;
        const line = lineKey(createLineFromPoints(move.a, move.b));
        if (seen.has(line)) continue;
        seen.add(line);
        result.push(move);
      }
    }
  }
  // Keep memory bounded when the settings are edited repeatedly.
  if (cache.size >= 8) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}
