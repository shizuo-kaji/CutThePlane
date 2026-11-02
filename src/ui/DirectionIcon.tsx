import type { Direction } from '../core';

export function DirectionIcon({ direction }: { direction: Direction }) {
  const scale = 9 / Math.max(Math.abs(direction.dx), Math.abs(direction.dy));
  return <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
    <line x1={13 - direction.dx * scale} y1={13 + direction.dy * scale} x2={13 + direction.dx * scale} y2={13 - direction.dy * scale} stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>;
}

export function directionLabel(direction: Direction): string {
  if (!direction.dy) return 'Horizontal';
  if (!direction.dx) return 'Vertical';
  return `Slope ${direction.dy}/${direction.dx}`;
}
