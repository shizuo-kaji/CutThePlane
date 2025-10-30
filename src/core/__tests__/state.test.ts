import { describe, expect, it } from 'vitest';
import { applyMove, createInitialState } from '../state';
import type { Move } from '../types';

describe('applyMove', () => {
  const baseState = createInitialState({
    size: 8,
    targetRooms: 5,
    directions: [
      { dx: 1, dy: 0 },
      { dx: 0, dy: 1 },
    ],
  });

  it('accepts a valid move and updates the room count', () => {
    const move: Move = { a: { x: 0, y: 4 }, b: { x: 8, y: 4 } };
    const outcome = applyMove(baseState, move);
    expect(outcome.error).toBeUndefined();
    expect(outcome.state.rooms).toBe(2);
  });

  it('rejects duplicate lines', () => {
    const move: Move = { a: { x: 4, y: 0 }, b: { x: 4, y: 8 } };
    const first = applyMove(baseState, move);
    expect(first.error).toBeUndefined();
    const second = applyMove(first.state, move);
    expect(second.error?.code).toBe('duplicate_line');
  });

  it('rejects moves that use a forbidden direction', () => {
    const diagonal: Move = { a: { x: 0, y: 0 }, b: { x: 4, y: 4 } };
    const outcome = applyMove(baseState, diagonal);
    expect(outcome.error?.code).toBe('direction_not_allowed');
  });
});
