import { describe, expect, it } from 'vitest';
import { countRooms } from '../counting';
import { createLineFromPoints } from '../../geom/lines';
import type { Line } from '../types';

function makeLine(a: [number, number], b: [number, number]): Line {
  return createLineFromPoints({ x: a[0], y: a[1] }, { x: b[0], y: b[1] });
}

describe('countRooms', () => {
  it('returns 1 when no lines are present', () => {
    expect(countRooms(10, [])).toBe(1);
  });

  it('counts rooms created by a single line', () => {
    const line = makeLine([4, 0], [4, 2]);
    expect(countRooms(10, [line])).toBe(2);
  });

  it('counts perpendicular lines correctly', () => {
    const lines = [
      makeLine([5, 0], [5, 10]),
      makeLine([0, 5], [10, 5]),
    ];
    expect(countRooms(10, lines)).toBe(4);
  });

  it('handles multiple parallel lines', () => {
    const lines = [
      makeLine([3, 0], [3, 8]),
      makeLine([6, 0], [6, 8]),
    ];
    expect(countRooms(8, lines)).toBe(3);
  });

  it('supports diagonal lines', () => {
    const line = makeLine([0, 8], [8, 0]);
    expect(countRooms(8, [line])).toBe(2);
  });
});
