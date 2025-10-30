import type { Direction, Line, Point } from '../core/types';

const EPS = 1e-9;

export function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y !== 0) {
    const tmp = x % y;
    x = y;
    y = tmp;
  }
  return x;
}

export function normalizeDirection(dx: number, dy: number): Direction {
  if (dx === 0 && dy === 0) {
    throw new Error('Zero-length direction is invalid.');
  }
  const g = gcd(dx, dy) || 1;
  let nx = dx / g;
  let ny = dy / g;
  if (nx < 0 || (nx === 0 && ny < 0)) {
    nx = -nx;
    ny = -ny;
  }
  return { dx: nx, dy: ny };
}

export function directionsEqual(a: Direction, b: Direction): boolean {
  return a.dx === b.dx && a.dy === b.dy;
}

export function normalFromDirection(direction: Direction): Direction {
  return { dx: -direction.dy, dy: direction.dx };
}

export function computeC(direction: Direction, anchor: Point): number {
  const normal = normalFromDirection(direction);
  return -(normal.dx * anchor.x + normal.dy * anchor.y);
}

export function lineKey(line: Line): string {
  return `${line.direction.dx},${line.direction.dy},${line.c}`;
}

export function createLineFromPoints(a: Point, b: Point): Line {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) {
    throw new Error('Cannot create a line from identical points.');
  }
  const direction = normalizeDirection(dx, dy);
  return {
    direction,
    anchor: { ...a },
    c: computeC(direction, a),
  };
}

export function isPointOnLine(point: Point, line: Line): boolean {
  const normal = normalFromDirection(line.direction);
  const value = normal.dx * point.x + normal.dy * point.y + line.c;
  return Math.abs(value) < EPS;
}
