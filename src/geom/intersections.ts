import type { Line, Point } from '../core/types';
import { gcd, normalFromDirection } from './lines';
import type { Segment } from './segment';
import { pointOnSegment } from './segment';

const EPS = 1e-9;

/** Exact identity of an intersection of integer lattice lines, including off-board points. */
export function intersectionKey(a: Line, b: Line): string | null {
  const na = normalFromDirection(a.direction);
  const nb = normalFromDirection(b.direction);
  const d = na.dx * nb.dy - na.dy * nb.dx;
  if (d === 0) return null;
  const x = na.dy * b.c - nb.dy * a.c;
  const y = nb.dx * a.c - na.dx * b.c;
  const divisor = gcd(gcd(x, y), d) * Math.sign(d);
  return `${x / divisor},${y / divisor},${d / divisor}`;
}

export function intersectLines(lineA: Line, lineB: Line): Point | null {
  const nA = normalFromDirection(lineA.direction);
  const nB = normalFromDirection(lineB.direction);
  const det = nA.dx * nB.dy - nA.dy * nB.dx;
  if (Math.abs(det) < EPS) {
    return null;
  }
  const x =
    (nB.dy * (-lineA.c) - nA.dy * (-lineB.c)) / det;
  const y =
    (-nB.dx * (-lineA.c) + nA.dx * (-lineB.c)) / det;
  return { x, y };
}

export function intersectSegments(segA: Segment, segB: Segment): Point | null {
  const x1 = segA.a.x;
  const y1 = segA.a.y;
  const x2 = segA.b.x;
  const y2 = segA.b.y;
  const x3 = segB.a.x;
  const y3 = segB.a.y;
  const x4 = segB.b.x;
  const y4 = segB.b.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < EPS) {
    return null;
  }
  const px =
    ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / denom;
  const py =
    ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / denom;
  const p = { x: px, y: py };
  if (pointOnSegment(p, segA, EPS) && pointOnSegment(p, segB, EPS)) {
    return p;
  }
  return null;
}
