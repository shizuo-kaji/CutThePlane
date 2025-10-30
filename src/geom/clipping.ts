import type { Line, Point } from '../core/types';
import type { Segment } from './segment';

const EPS = 1e-9;

interface Bound {
  axis: 'x' | 'y';
  value: number;
}

const bounds: Bound[] = [
  { axis: 'x', value: 0 },
  { axis: 'x', value: 1 },
  { axis: 'y', value: 0 },
  { axis: 'y', value: 1 },
];

export function clipLineToBox(line: Line, size: number): Segment | null {
  const normBounds = bounds.map((b) => ({
    axis: b.axis,
    value: b.value * size,
  }));
  const points: Point[] = [];
  const d = line.direction;
  const anchor = line.anchor;

  for (const bound of normBounds) {
    if (bound.axis === 'x') {
      if (Math.abs(d.dx) < EPS) {
        if (Math.abs(anchor.x - bound.value) < EPS) {
          points.push({ x: bound.value, y: 0 });
          points.push({ x: bound.value, y: size });
          break;
        }
        continue;
      }
      const t = (bound.value - anchor.x) / d.dx;
      const y = anchor.y + d.dy * t;
      if (y >= -EPS && y <= size + EPS) {
        points.push({ x: bound.value, y: clamp(y, 0, size) });
      }
    } else {
      if (Math.abs(d.dy) < EPS) {
        if (Math.abs(anchor.y - bound.value) < EPS) {
          points.push({ x: 0, y: bound.value });
          points.push({ x: size, y: bound.value });
          break;
        }
        continue;
      }
      const t = (bound.value - anchor.y) / d.dy;
      const x = anchor.x + d.dx * t;
      if (x >= -EPS && x <= size + EPS) {
        points.push({ x: clamp(x, 0, size), y: bound.value });
      }
    }
  }

  // Remove duplicates.
  const unique: Point[] = [];
  for (const p of points) {
    if (!unique.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < EPS)) {
      unique.push(p);
    }
  }

  if (unique.length < 2) {
    return null;
  }
  if (unique.length > 2) {
    unique.sort((p, q) => distanceSq(p, anchor) - distanceSq(q, anchor));
  }

  const [a, b] = unique;
  return { a, b };
}

export function lineMatchesBoundary(line: Line, size: number): boolean {
  const segment = clipLineToBox(line, size);
  if (!segment) {
    return true;
  }
  const corners = [
    { x: 0, y: 0 },
    { x: size, y: 0 },
    { x: size, y: size },
    { x: 0, y: size },
  ];
  const endpointsOnCorners =
    corners.some((c) => distanceSq(c, segment.a) < EPS) &&
    corners.some((c) => distanceSq(c, segment.b) < EPS);
  if (!endpointsOnCorners) {
    return false;
  }
  // Check if segment is axis-aligned along boundary.
  return (
    (Math.abs(segment.a.y) < EPS && Math.abs(segment.b.y) < EPS) ||
    (Math.abs(segment.a.y - size) < EPS && Math.abs(segment.b.y - size) < EPS) ||
    (Math.abs(segment.a.x) < EPS && Math.abs(segment.b.x) < EPS) ||
    (Math.abs(segment.a.x - size) < EPS && Math.abs(segment.b.x - size) < EPS)
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function distanceSq(a: Point, b: Point): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}
