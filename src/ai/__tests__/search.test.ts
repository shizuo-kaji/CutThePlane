import { describe, expect, it } from 'vitest';
import { applyMove, candidateMoves, createInitialState } from '../../core';
import type { GameState, Move } from '../../core';
import { createLineFromPoints, lineKey } from '../../geom';
import { chooseMove } from '../search';
import { AI_LEVEL_KEYS } from '../levels';
import { PositionModel } from '../position';
import { useGameStore } from '../../hooks/useGameStore';

const orthogonal = [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }];
const moveKey = (move: Move) => lineKey(createLineFromPoints(move.a, move.b));
const legal = (game: GameState) => candidateMoves(game.config).flatMap((move) => {
  const result = applyMove(game, move);
  return result.error ? [] : [{ move, state: result.state }];
});
const horizontal: Move = { a: { x: 0, y: 2 }, b: { x: 4, y: 2 } };

/** Exhaustive oracle using only the game's public rules, independent of the AI's simulation model. */
function oracle(game: GameState, memo = new Map<string, number>()): number {
  if (game.status === 'finished') return game.winner === null ? 0 : game.winner === game.turn ? 1 : -1;
  const key = game.lines.map(lineKey).sort().join(';');
  const cached = memo.get(key); if (cached !== undefined) return cached;
  const children = legal(game);
  const value = children.length ? Math.max(...children.map(({ state }) => -oracle(state, memo))) : 0;
  memo.set(key, value); return value;
}

function smallPositions(initial: GameState): GameState[] {
  const positions = new Map<string, GameState>();
  const visit = (state: GameState) => {
    if (state.status !== 'playing') return;
    const key = state.lines.map(lineKey).sort().join(';');
    if (positions.has(key)) return;
    positions.set(key, state); legal(state).forEach(({ state: next }) => visit(next));
  };
  visit(initial); return [...positions.values()];
}

describe('simulation agrees with the rules', () => {
  it('preserves legal lines, room gains, and outcomes across all rule combinations', () => {
    for (const scoring of ['board', 'plane'] as const) for (const rule of ['avoidance', 'race'] as const)
      for (const allowTriplePoints of [true, false]) for (const limited of [true, false]) {
        let game = createInitialState({ size: 4, targetRooms: 40, scoring, rule, allowTriplePoints,
          directions: [...orthogonal, { dx: 1, dy: 1 }, { dx: 2, dy: 1 }, { dx: 1, dy: 2 }],
          capacities: limited ? { '1,0': 1, '0,1': 2, '1,1': 2, '2,1': 1, '1,2': 1 } : null });
        for (let turn = 0; turn < 8 && game.status === 'playing'; turn++) {
          const model = new PositionModel(game), analysis = model.analyze(model.initial);
          const expected = legal(game);
          expect(analysis.moves.map((m) => moveKey(model.candidates[m.id].move)).sort()).toEqual(expected.map(({ move }) => moveKey(move)).sort());
          for (const action of analysis.moves) {
            const actual = expected.find(({ move }) => moveKey(move) === moveKey(model.candidates[action.id].move))!.state;
            const predicted = model.advance(model.initial, action);
            expect(predicted.rooms).toBe(actual.rooms);
            expect(predicted.turn).toBe(actual.turn);
            if (actual.endReason === 'no_moves') expect(model.analyze(predicted).moves).toHaveLength(0);
            else expect(predicted.winner).toBe(actual.status === 'finished' ? actual.winner : undefined);
          }
          game = expected[(turn * 7 + 3) % expected.length].state;
        }
      }
  });
});

describe.each(AI_LEVEL_KEYS)('%s difficulty', (level) => {
  it('takes an immediate race win', () => {
    const start = createInitialState({ size: 4, targetRooms: 4, directions: orthogonal, rule: 'race' });
    const game = applyMove(start, horizontal).state;
    const choice = chooseMove(game, level, { seed: 5 })!;
    expect(choice.nextState.winner).toBe(game.turn);
  });
  it('does not deliberately lose immediately when a safe cut exists', () => {
    const start = createInitialState({ size: 4, targetRooms: 4, directions: orthogonal });
    const game = applyMove(start, horizontal).state;
    const choice = chooseMove(game, level, { seed: 12 })!;
    expect(choice.nextState.rooms).toBe(3);
  });
  it('chooses a capacity draw over a losing threshold crossing', () => {
    let game = createInitialState({ size: 4, targetRooms: 7,
      directions: [...orthogonal, { dx: 1, dy: 1 }],
      capacities: { '1,0': 1, '0,1': 1, '1,1': 1 } });
    game = applyMove(game, { a: { x: 2, y: 0 }, b: { x: 2, y: 4 } }).state;
    game = applyMove(game, { a: { x: 0, y: 0 }, b: { x: 4, y: 4 } }).state;
    const choice = chooseMove(game, level, { seed: 2 })!;
    expect(choice.nextState.rooms).toBe(6);
    expect(choice.nextState.endReason).toBe('capacity');
    expect(choice.nextState.winner).toBeNull();
  });
  it('returns a legal fallback without a search budget', () => {
    const game = createInitialState();
    const choice = chooseMove(game, level, { seed: 1, timeMs: 0 })!;
    expect(applyMove(game, choice.move).error).toBeUndefined();
    expect(choice.stats.iterations).toBe(0);
  });
});

describe('natural choices and level separation', () => {
  it('varies equal openings across directions and positions without hugging one edge', () => {
    const game = createInitialState();
    const lines = Array.from({ length: 32 }, (_, seed) => createLineFromPoints(
      chooseMove(game, 'easy', { seed })!.move.a, chooseMove(game, 'easy', { seed })!.move.b));
    expect(new Set(lines.map(lineKey)).size).toBeGreaterThan(12);
    expect(new Set(lines.map((l) => `${l.direction.dx},${l.direction.dy}`)).size).toBe(4);
    const meanDistance = lines.reduce((sum, l) => sum + Math.abs((-l.direction.dy + l.direction.dx) * 5.5 + l.c) / Math.hypot(l.direction.dx, l.direction.dy) / 11, 0) / lines.length;
    expect(meanDistance).toBeLessThan(0.28);
  });
  it('uses a repeatable seed and genuinely searches replies on Standard and Hard', () => {
    const game = createInitialState();
    for (const level of ['normal', 'hard'] as const) {
      const options = { seed: 987, maxIterations: 40, timeMs: 10000 };
      const first = chooseMove(game, level, options)!;
      const second = chooseMove(game, level, options)!;
      expect(moveKey(first.move)).toBe(moveKey(second.move));
      expect(first.stats.iterations).toBe(40);
    }
    expect(chooseMove(game, 'easy', { seed: 987 })!.stats.iterations).toBe(0);
  });
  it('plays every small endgame optimally while Easy can miss deeper traps', () => {
    let checked = 0, easyMistakes = 0;
    for (const rule of ['race', 'avoidance'] as const) for (let targetRooms = 3; targetRooms <= 16; targetRooms++) {
      const positions = smallPositions(createInitialState({ size: 4, directions: orthogonal, targetRooms, rule }));
      const memo = new Map<string, number>();
      for (const game of positions) {
        const best = oracle(game, memo);
        const hard = chooseMove(game, 'hard', { seed: checked + 1, timeMs: 5000 })!;
        expect(-oracle(hard.nextState, memo)).toBe(best);
        expect(hard.stats.solved).toBe(true);
        const easy = chooseMove(game, 'easy', { seed: checked + 1 })!;
        if (-oracle(easy.nextState, memo) < best) easyMistakes++;
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(100);
    expect(easyMistakes).toBeGreaterThan(0);
  });
  it('keeps every level legal throughout a match with triple restrictions and capacities', () => {
    for (const scoring of ['board', 'plane'] as const) for (const level of AI_LEVEL_KEYS) {
      let game = createInitialState({ size: 4, scoring, targetRooms: 50, allowTriplePoints: false,
        capacities: { '1,0': 1, '0,1': 2, '1,1': 1, '1,-1': 1 } });
      for (let turn = 0; turn < 6 && game.status === 'playing'; turn++) {
        const choice = chooseMove(game, level, { seed: turn + 1, maxIterations: 20, timeMs: 5000 })!;
        const outcome = applyMove(game, choice.move); expect(outcome.error).toBeUndefined(); game = outcome.state;
      }
      expect(game.status).toBe('finished');
    }
  });
});

describe('difficulty changes during a computer turn', () => {
  it('preserves the board and rejects an old answer and error after changing level', () => {
    const store = useGameStore.getState();
    store.startNewGame(createInitialState().config, [true, false], ['normal', 'easy']);
    const before = useGameStore.getState();
    store.setAiLevel(0, 'hard');
    expect(useGameStore.getState().game).toBe(before.game);
    store.acceptAiMove(before.game, horizontal, before.aiRevision);
    store.failAi(before.game, 'obsolete failure', before.aiRevision);
    expect(useGameStore.getState().game.moveNumber).toBe(0);
    expect(useGameStore.getState().aiPlayers[0]).toBe(true);
    expect(useGameStore.getState().message).toBeNull();
    store.acceptAiMove(before.game, horizontal, useGameStore.getState().aiRevision);
    expect(useGameStore.getState().game.moveNumber).toBe(1);
  });
  it('preserves the independently selected levels when replaying', () => {
    const store = useGameStore.getState();
    store.startNewGame(createInitialState().config, [true, true], ['easy', 'hard']);
    store.startNewGame();
    expect(useGameStore.getState().aiLevels).toEqual(['easy', 'hard']);
  });
});
