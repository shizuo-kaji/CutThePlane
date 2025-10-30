import type { Point } from '../core/types';

export interface CanvasPoint {
  x: number;
  y: number;
}

export function boardToCanvas(
  point: Point,
  size: number,
  pixelSize: number,
): CanvasPoint {
  const scale = pixelSize / size;
  return {
    x: point.x * scale,
    y: pixelSize - point.y * scale,
  };
}

export function snapToLattice(
  x: number,
  y: number,
  size: number,
): Point {
  const clampedX = clamp(Math.round(x), 0, size);
  const clampedY = clamp(Math.round(y), 0, size);
  return { x: clampedX, y: clampedY };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
