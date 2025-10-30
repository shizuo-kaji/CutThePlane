import type { Line } from './types';
import { clipLineToBox } from '../geom/clipping';
import type { Segment } from '../geom/segment';
import { pointOnSegment, segmentLength } from '../geom/segment';
import { intersectSegments } from '../geom/intersections';

const EPS = 1e-9;

interface IndexedPoint {
  id: number;
  t: number;
}

class PointIndex {
  private readonly eps: number;
  private readonly points: { x: number; y: number }[] = [];

  constructor(eps = EPS) {
    this.eps = eps;
  }

  add(x: number, y: number): number {
    for (let i = 0; i < this.points.length; i += 1) {
      const p = this.points[i];
      if (Math.hypot(p.x - x, p.y - y) < this.eps) {
        return i;
      }
    }
    this.points.push({ x, y });
    return this.points.length - 1;
  }

  get(id: number) {
    return this.points[id];
  }

  toArray() {
    return this.points.slice();
  }

  get size() {
    return this.points.length;
  }
}

function makeBoundarySegments(size: number): Segment[] {
  return [
    { a: { x: 0, y: 0 }, b: { x: size, y: 0 } },
    { a: { x: size, y: 0 }, b: { x: size, y: size } },
    { a: { x: size, y: size }, b: { x: 0, y: size } },
    { a: { x: 0, y: size }, b: { x: 0, y: 0 } },
  ];
}

function collectSegments(lines: Line[], size: number): Segment[] {
  const result: Segment[] = [];
  for (const line of lines) {
    const segment = clipLineToBox(line, size);
    if (segment) {
      result.push(segment);
    }
  }
  return result;
}

function buildEdges(segments: Segment[], points: PointIndex) {
  const edgeKeys = new Set<string>();
  const adjacency = new Map<number, Set<number>>();

  for (const segment of segments) {
    const length = segmentLength(segment);
    if (length < EPS) {
      continue;
    }
    const indexed: IndexedPoint[] = [];
    for (let id = 0; id < points.size; id += 1) {
      const p = points.get(id);
      if (!pointOnSegment(p, segment, EPS)) {
        continue;
      }
      const t = paramAlongSegment(segment, p);
      indexed.push({ id, t });
    }
    indexed.sort((a, b) => a.t - b.t);
    for (let i = 0; i < indexed.length - 1; i += 1) {
      const a = indexed[i];
      const b = indexed[i + 1];
      if (Math.abs(a.t - b.t) < EPS) {
        continue;
      }
      addEdge(edgeKeys, adjacency, a.id, b.id);
    }
  }

  return { edgeKeys, adjacency };
}

function addEdge(
  edgeKeys: Set<string>,
  adjacency: Map<number, Set<number>>,
  u: number,
  v: number,
) {
  if (u === v) {
    return;
  }
  const [a, b] = u < v ? [u, v] : [v, u];
  const key = `${a}|${b}`;
  if (edgeKeys.has(key)) {
    return;
  }
  edgeKeys.add(key);
  if (!adjacency.has(a)) {
    adjacency.set(a, new Set());
  }
  if (!adjacency.has(b)) {
    adjacency.set(b, new Set());
  }
  adjacency.get(a)!.add(b);
  adjacency.get(b)!.add(a);
}

function paramAlongSegment(segment: Segment, point: { x: number; y: number }): number {
  const dx = segment.b.x - segment.a.x;
  const dy = segment.b.y - segment.a.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const denom = dx || (dy === 0 ? 1 : dy);
    return denom === 0 ? 0 : (point.x - segment.a.x) / denom;
  }
  const denom = dy || (dx === 0 ? 1 : dx);
  return denom === 0 ? 0 : (point.y - segment.a.y) / denom;
}

function countComponents(adjacency: Map<number, Set<number>>): number {
  const visited = new Set<number>();
  let components = 0;
  for (const node of adjacency.keys()) {
    if (visited.has(node)) {
      continue;
    }
    components += 1;
    const queue: number[] = [node];
    visited.add(node);
    while (queue.length > 0) {
      const current = queue.pop()!;
      const neighbors = adjacency.get(current);
      if (!neighbors) {
        continue;
      }
      for (const next of neighbors) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
  }
  if (components === 0) {
    // The graph might only contain isolated vertices (corners).
    return adjacency.size > 0 ? adjacency.size : 1;
  }
  return components;
}

export function countRooms(size: number, lines: Line[]): number {
  if (size <= 0) {
    return 0;
  }
  const boundarySegments = makeBoundarySegments(size);
  const lineSegments = collectSegments(lines, size);
  const allSegments = [...boundarySegments, ...lineSegments];

  const points = new PointIndex();

  for (const segment of allSegments) {
    points.add(segment.a.x, segment.a.y);
    points.add(segment.b.x, segment.b.y);
  }

  for (let i = 0; i < lineSegments.length; i += 1) {
    for (let j = i + 1; j < lineSegments.length; j += 1) {
      const hit = intersectSegments(lineSegments[i], lineSegments[j]);
      if (hit) {
        points.add(hit.x, hit.y);
      }
    }
  }

  const { edgeKeys, adjacency } = buildEdges(allSegments, points);

  const edgeCount = edgeKeys.size;
  const vertexCount = points.size;
  const componentCount = countComponents(adjacency);
  const rooms = edgeCount - vertexCount + componentCount;
  return Math.max(rooms, 1);
}
