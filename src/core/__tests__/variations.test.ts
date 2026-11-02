import { describe, expect, it } from 'vitest';
import { addedRooms, applyMove, candidateMoves, countPlaneRooms, countRooms, createInitialState, directionKey, directionUsage, hasLegalMove } from '../index';
import type { GameState, Line, Move } from '../types';
import { createLineFromPoints, intersectLines } from '../../geom';
import { fitViewport, roomPolygons, worldToCanvas, canvasToWorld } from '../../ui/boardMath';
import { chooseMove } from '../../ai/search';
import { useGameStore } from '../../hooks/useGameStore';

const move = (x: number, y: number, X: number, Y: number): Move => ({ a: { x, y }, b: { x: X, y: Y } });
const line = (m: Move) => createLineFromPoints(m.a, m.b);
const orthogonal = [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }];
const put = (state: GameState, m: Move) => { const next = applyMove(state, m); expect(next.error).toBeUndefined(); return next.state; };

describe('rule variants', () => {
  it('preserves the original default rules', () => {
    const state = createInitialState();
    expect(state.config).toMatchObject({ scoring: 'board', rule: 'avoidance', allowTriplePoints: true, capacities: null, size: 11, targetRooms: 20 });
  });
  it.each(['avoidance', 'race'] as const)('resolves an exact target under %s', (rule) => {
    const state = put(createInitialState({ targetRooms: 2, rule }), move(0, 2, 11, 2));
    expect(state.status).toBe('finished'); expect(state.endReason).toBe('threshold');
    expect(state.winner).toBe(rule === 'race' ? 0 : 1); expect(state.loser).toBe(rule === 'race' ? 1 : 0);
    expect(applyMove(state, move(1, 0, 1, 11)).error?.code).toBe('game_finished');
  });
  it.each(['avoidance', 'race'] as const)('resolves an overshoot under %s', (rule) => {
    let state = createInitialState({ targetRooms: 3, rule });
    state = put(state, move(0, 2, 11, 2)); state = put(state, move(2, 0, 2, 11));
    expect(state.rooms).toBe(4); expect(state.winner).toBe(rule === 'race' ? 1 : 0);
  });
  it('counts off-board crossings only in whole-plane mode', () => {
    const lines = [line(move(0, 0, 8, 8)), line(move(0, 5, 2, 6))];
    expect(countRooms(8, lines)).toBe(3); expect(countPlaneRooms(lines)).toBe(4);
    for (const scoring of ['board', 'plane'] as const) {
      let state = createInitialState({ size: 8, scoring, directions: [{ dx: 1, dy: 1 }, { dx: 2, dy: 1 }] });
      state = put(state, move(0, 0, 8, 8)); state = put(state, move(0, 5, 2, 6));
      expect(state.rooms).toBe(scoring === 'board' ? 3 : 4);
    }
  });
  it('counts concurrent lines once per distinct crossing', () => {
    const lines = [line(move(0, 4, 8, 4)), line(move(4, 0, 4, 8)), line(move(0, 0, 8, 8)), line(move(0, 8, 8, 0))];
    expect(countPlaneRooms(lines)).toBe(8); expect(countRooms(8, lines)).toBe(8);
  });
  it.each(['board', 'plane'] as const)('rejects off-board triple points under %s scoring', (scoring) => {
    let state = createInitialState({ size: 8, scoring, targetRooms: 50, allowTriplePoints: false, directions: [{ dx: 1, dy: 1 }, { dx: 2, dy: 1 }, { dx: 1, dy: 2 }] });
    state = put(state, move(0, 0, 8, 8)); state = put(state, move(0, 5, 2, 6));
    const outcome = applyMove(state, move(5, 0, 6, 2));
    expect(outcome.error?.code).toBe('triple_point'); expect(outcome.state).toBe(state);
    const allowed = applyMove({ ...state, config: { ...state.config, allowTriplePoints: true } }, move(5, 0, 6, 2));
    expect(allowed.error).toBeUndefined(); expect(allowed.state.rooms).toBe(scoring === 'plane' ? 6 : 4);
  });
  it('permits board-edge lines only when counting the plane', () => {
    expect(applyMove(createInitialState(), move(0, 0, 11, 0)).error?.code).toBe('line_matches_boundary');
    const plane = put(createInitialState({ scoring: 'plane' }), move(0, 0, 11, 0)); expect(plane.rooms).toBe(2);
  });
  it('rejects duplicate lines independently of the chosen anchors', () => {
    const state = put(createInitialState(), move(0, 1, 3, 1));
    expect(applyMove(state, move(10, 1, 7, 1)).error?.code).toBe('duplicate_line');
  });
  it.each(['race', 'avoidance'] as const)('draws on capacity exhaustion under %s', (rule) => {
    let state = createInitialState({ rule, targetRooms: 99, capacities: { '1,0': 1, '0,1': 1 }, directions: orthogonal });
    state = put(state, move(0, 2, 11, 2));
    expect(state.status).toBe('playing'); expect(applyMove(state, move(0, 3, 11, 3)).error?.code).toBe('capacity_reached');
    state = put(state, move(2, 0, 2, 11));
    expect(state).toMatchObject({ status: 'finished', winner: null, loser: null, endReason: 'capacity', rooms: 4 });
  });
  it('gives threshold crossing precedence over exhausted capacity', () => {
    const state = put(createInitialState({ rule: 'race', targetRooms: 2, directions: [orthogonal[0]], capacities: { '1,0': 1 } }), move(0, 1, 11, 1));
    expect(state.endReason).toBe('threshold'); expect(state.winner).toBe(0);
  });
  it('allows zero capacities and recognizes an initially drawn game', () => {
    const state = createInitialState({ directions: orthogonal, capacities: { '1,0': 0, '0,1': 0 } });
    expect(state).toMatchObject({ status: 'finished', endReason: 'capacity', moveNumber: 0, winner: null });
  });
  it('uses shared per-direction capacities and treats omitted ones as unlimited', () => {
    let state = createInitialState({ directions: orthogonal, capacities: { '1,0': 1 } });
    state = put(state, move(0, 1, 11, 1));
    expect(applyMove(state, move(0, 2, 11, 2)).error?.code).toBe('capacity_reached');
    state = put(state, move(2, 0, 2, 11)); expect(state.status).toBe('playing');
  });
  it('draws when finite lattice moves run out for either control type', () => {
    let state = createInitialState({ size: 2, directions: orthogonal, targetRooms: 99 });
    state = put(state, move(0, 1, 2, 1)); state = put(state, move(1, 0, 1, 2));
    expect(state).toMatchObject({ status: 'finished', endReason: 'no_moves', winner: null, loser: null });
    expect(hasLegalMove(state)).toBe(false); expect(chooseMove(state, 'normal', { seed: 4, maxIterations: 60, timeMs: 3000 })).toBeNull();
  });
  it('validates target, size, and direction input', () => {
    expect(() => createInitialState({ targetRooms: 1 })).toThrow();
    expect(() => createInitialState({ size: NaN })).toThrow();
    expect(() => createInitialState({ directions: [{ dx: 0.5, dy: 1 }] })).toThrow();
    expect(() => createInitialState({ directions: [] })).toThrow();
    expect(() => createInitialState({ capacities: { '1,0': -1 } })).toThrow();
    expect(() => createInitialState({ directions: [{ dx: 20, dy: 1 }], size: 11 })).toThrow();
  });
});

describe('counting and rendering invariants', () => {
  it('matches the independent Euler counter across lattice arrangements and move orders', () => {
    const config = createInitialState({ size: 5, targetRooms: 10000 }).config;
    const candidates = candidateMoves(config);
    for (let offset = 0; offset < 12; offset++) {
      const chosen: Line[] = []; let rooms = 1;
      for (let n = offset; n < candidates.length; n += 7) {
        const candidate = line(candidates[n]);
        const delta = addedRooms(config, chosen, candidate);
        if (!delta) continue;
        rooms += delta; chosen.push(candidate);
        expect(rooms).toBe(countRooms(config.size, chosen));
      }
      expect(countPlaneRooms(chosen)).toBe(countPlaneRooms([...chosen].reverse()));
    }
  });
  it('fits every crossing with room to see the exterior regions', () => {
    const lines = [line(move(0, 0, 8, 8)), line(move(0, 5, 2, 6)), line(move(5, 0, 6, 2))];
    const view = fitViewport(8, lines);
    expect(view.size).toBeGreaterThan(8);
    for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
      const p = intersectLines(lines[i], lines[j])!;
      expect(p.x).toBeGreaterThan(view.minX); expect(p.x).toBeLessThan(view.minX + view.size);
      expect(p.y).toBeGreaterThan(view.minY); expect(p.y).toBeLessThan(view.minY + view.size);
    }
    expect(roomPolygons(lines, view).length).toBe(countPlaneRooms(lines));
    const p = { x: 2, y: 3 }; const roundTrip = canvasToWorld(worldToCanvas(p, view, 600), view, 600);
    expect(roundTrip.x).toBeCloseTo(p.x); expect(roundTrip.y).toBeCloseTo(p.y);
  });
});

describe('computer and UI state', () => {
  it('takes an immediate race win instead of pruning it out', () => {
    let state = createInitialState({ size: 4, targetRooms: 4, rule: 'race', directions: orthogonal });
    state = put(state, move(0, 2, 4, 2));
    const choice = chooseMove(state, 'normal', { seed: 4, maxIterations: 60, timeMs: 3000 })!;
    expect(choice.nextState.winner).toBe(state.turn);
  });
  it('avoids a losing threshold crossing when a safe move is available', () => {
    let state = createInitialState({ size: 4, targetRooms: 4, rule: 'avoidance', directions: orthogonal });
    state = put(state, move(0, 2, 4, 2));
    expect(chooseMove(state, 'normal', { seed: 4, maxIterations: 60, timeMs: 3000 })!.nextState.rooms).toBe(3);
  });
  it('obeys simple intersections and capacity constraints in computer matches', () => {
    for (const rule of ['avoidance', 'race'] as const) {
      let state = createInitialState({ size: 4, rule, scoring: 'plane', targetRooms: 30, allowTriplePoints: false, capacities: { '1,0': 1, '0,1': 2, '1,1': 1, '1,-1': 1 } });
      for (let n = 0; n < 6 && state.status === 'playing'; n++) {
        const decision = chooseMove(state, 'normal', { seed: 4, maxIterations: 60, timeMs: 3000 });
        expect(decision).not.toBeNull(); state = put(state, decision!.move);
        for (const d of state.config.directions) expect(directionUsage(state, d)).toBeLessThanOrEqual(state.config.capacities![directionKey(d)]);
      }
      expect(state.status).toBe('finished');
    }
  });
  it('ignores stale computer responses after restarting', () => {
    const store = useGameStore.getState(); store.startNewGame(createInitialState().config, [true, false]);
    const old = useGameStore.getState().game;
    store.startNewGame(); const current = useGameStore.getState().game;
    store.acceptAiMove(old, move(0, 1, 11, 1), useGameStore.getState().aiRevision); expect(useGameStore.getState().game).toBe(current);
  });
  it('keeps the selected anchor after an illegal move without consuming a turn', () => {
    const store = useGameStore.getState(); store.startNewGame(createInitialState().config, [false, false]);
    store.handlePoint({ x: 0, y: 0 }); store.handlePoint({ x: 11, y: 0 });
    expect(useGameStore.getState().game.moveNumber).toBe(0); expect(useGameStore.getState().selected).toEqual({ x: 0, y: 0 }); expect(useGameStore.getState().message).toBeTruthy();
  });
});
