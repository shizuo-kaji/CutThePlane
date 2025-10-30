import type { Point } from '../core/types';

export interface Segment {
  a: Point;
  b: Point;
}

export function segmentEquals(s1: Segment, s2: Segment, eps = 1e-9): boolean {
  return (
    (pointsEqual(s1.a, s2.a, eps) && pointsEqual(s1.b, s2.b, eps)) ||
    (pointsEqual(s1.a, s2.b, eps) && pointsEqual(s1.b, s2.a, eps))
  );
}

export function pointsEqual(a: Point, b: Point, eps = 1e-9): boolean {
  return Math.abs(a.x - b.x) < eps && Math.abs(a.y - b.y) < eps;
}

export function pointDistance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function segmentLength(seg: Segment): number {
  return pointDistance(seg.a, seg.b);
}

export function pointOnSegment(p: Point, seg: Segment, eps = 1e-9): boolean {
  const cross =
    (seg.b.x - seg.a.x) * (p.y - seg.a.y) - (seg.b.y - seg.a.y) * (p.x - seg.a.x);
  if (Math.abs(cross) > eps) {
    return false;
  }
  const dot =
    (p.x - seg.a.x) * (seg.b.x - seg.a.x) + (p.y - seg.a.y) * (seg.b.y - seg.a.y);
  if (dot < -eps) {
    return false;
  }
  const squaredLen = segmentLength(seg) ** 2;
  if (dot - squaredLen > eps) {
    return false;
  }
  return true;
}
