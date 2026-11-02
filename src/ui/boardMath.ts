import type { Line, Point } from '../core/types';
import { intersectLines } from '../geom/intersections';
import { normalFromDirection } from '../geom/lines';
import { clipLineToBox } from '../geom/clipping';
import type { Segment } from '../geom/segment';

export interface Viewport { minX: number; minY: number; size: number }
export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const snapToLattice = (x: number, y: number, size: number): Point => ({ x: clamp(Math.round(x), 0, size), y: clamp(Math.round(y), 0, size) });
export function boardViewport(size: number): Viewport { return { minX: -size * 0.06, minY: -size * 0.06, size: size * 1.12 }; }

export function fitViewport(size: number, lines: Line[]): Viewport {
  let minX = 0, minY = 0, maxX = size, maxY = size;
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const p = intersectLines(lines[i], lines[j]);
      if (!p) continue;
      minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
    }
  }
  const span = Math.max(maxX - minX, maxY - minY) * 1.16;
  return { minX: (minX + maxX - span) / 2, minY: (minY + maxY - span) / 2, size: span };
}

export function worldToCanvas(point: Point, view: Viewport, pixels: number): Point {
  return { x: (point.x - view.minX) / view.size * pixels, y: (1 - (point.y - view.minY) / view.size) * pixels };
}
export function canvasToWorld(point: Point, view: Viewport, pixels: number): Point {
  return { x: view.minX + point.x / pixels * view.size, y: view.minY + (1 - point.y / pixels) * view.size };
}
export function clipToViewport(line: Line, view: Viewport): Segment | null {
  const clipped = clipLineToBox({ ...line, anchor: { x: line.anchor.x - view.minX, y: line.anchor.y - view.minY } }, view.size);
  return clipped ? { a: { x: clipped.a.x + view.minX, y: clipped.a.y + view.minY }, b: { x: clipped.b.x + view.minX, y: clipped.b.y + view.minY } } : null;
}

/** Convex pieces for quiet region shading; the scoring engine is independent of this display. */
export function roomPolygons(lines: Line[], view: Viewport): Point[][] {
  let polygons: Point[][] = [[{ x: view.minX, y: view.minY }, { x: view.minX + view.size, y: view.minY }, { x: view.minX + view.size, y: view.minY + view.size }, { x: view.minX, y: view.minY + view.size }]];
  for (const line of lines) {
    const normal = normalFromDirection(line.direction);
    const signed = (p: Point) => normal.dx * p.x + normal.dy * p.y + line.c;
    const next: Point[][] = [];
    for (const polygon of polygons) {
      const values = polygon.map(signed);
      if (!values.some((v) => v > 1e-8) || !values.some((v) => v < -1e-8)) { next.push(polygon); continue; }
      for (const sign of [1, -1]) {
        const part: Point[] = [];
        for (let i = 0; i < polygon.length; i++) {
          const a = polygon[i], b = polygon[(i + 1) % polygon.length];
          const va = values[i] * sign, vb = values[(i + 1) % polygon.length] * sign;
          if (va >= 0) part.push(a);
          if ((va < 0 && vb > 0) || (va > 0 && vb < 0)) {
            const t = va / (va - vb);
            part.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
          }
        }
        if (part.length >= 3) next.push(part);
      }
    }
    polygons = next;
    if (polygons.length > 350) return []; // Keep rendering responsive in very large arrangements.
  }
  return polygons;
}
