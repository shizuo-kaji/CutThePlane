import { applyMove } from '../core/state';
import type { GameState, Move, PlayerIndex } from '../core/types';
import { AI_LEVELS } from './levels';
import type { AiLevel } from './levels';
import { PositionModel } from './position';
import type { PositionAnalysis, SearchMove, SearchPosition } from './position';

export interface AiDecision {
  move: Move;
  nextState: GameState;
  stats: { level: AiLevel; iterations: number; solved: boolean };
}
export interface SearchOptions { seed?: number; maxIterations?: number; timeMs?: number }
interface Edge { move: SearchMove; child?: Node; visits: number; total: number; known?: number }
interface Node { position: SearchPosition; analysis: PositionAnalysis; edges: Edge[]; visits: number }

const TIMEOUT = Symbol('search deadline');
const valueFor = (winner: PlayerIndex | null, player: PlayerIndex) => winner === null ? 0 : winner === player ? 1 : -1;

function randomGenerator(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let n = Math.imul(value ^ value >>> 15, value | 1);
    n ^= n + Math.imul(n ^ n >>> 7, n | 61);
    return ((n ^ n >>> 14) >>> 0) / 4294967296;
  };
}

function weightedPick<T>(values: T[], weight: (value: T) => number, random: () => number): T {
  const weights = values.map(weight);
  let cursor = random() * weights.reduce((sum, w) => sum + w, 0);
  for (let i = 0; i < values.length; i++) { cursor -= weights[i]; if (cursor <= 0) return values[i]; }
  return values[values.length - 1];
}

/** Keep different directions AND room increases, rather than the first few lines in grid order. */
function shortlist(moves: SearchMove[], width: number, random: () => number): SearchMove[] {
  if (moves.length <= width) return [...moves].sort((a, b) => b.style - a.style);
  const groups = new Map<string, { move: SearchMove; rank: number }[]>();
  for (const move of moves) {
    const key = `${move.direction}:${move.gain}:${move.outcome}`;
    if (!groups.has(key)) groups.set(key, []);
    // Random priorities retain varied positions, with a soft preference for readable cuts.
    groups.get(key)!.push({ move, rank: -Math.log(Math.max(random(), 1e-9)) / Math.exp(3 * move.style) });
  }
  const buckets = [...groups.values()].map((bucket) => bucket.sort((a, b) => a.rank - b.rank));
  // A shuffled round-robin prevents a direction or low increment from owning the search width.
  for (let i = buckets.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [buckets[i], buckets[j]] = [buckets[j], buckets[i]]; }
  const result: SearchMove[] = [];
  for (let round = 0; result.length < width; round++) {
    let added = false;
    for (const bucket of buckets) {
      if (bucket[round]) { result.push(bucket[round].move); added = true; }
      if (result.length === width) break;
    }
    if (!added) break;
  }
  return result;
}

export function chooseMove(game: GameState, level: AiLevel = 'normal', options: SearchOptions = {}): AiDecision | null {
  if (game.status !== 'playing') return null;
  const settings = AI_LEVELS[level];
  const random = randomGenerator(options.seed ?? Math.floor(Math.random() * 0x100000000));
  const deadline = Date.now() + Math.max(0, options.timeMs ?? settings.timeMs);
  const checkBudget = () => { if (Date.now() >= deadline) throw TIMEOUT; };
  const model = new PositionModel(game);
  // The first scan is always complete: even a zero search budget must produce a legal, safe fallback.
  const rootAnalysis = model.analyze(model.initial);
  if (!rootAnalysis.moves.length) return null;
  let iterations = 0;
  const finish = (move: SearchMove, solved = false): AiDecision => {
    const proposed = model.candidates[move.id].move;
    const outcome = applyMove(game, proposed);
    if (outcome.error) throw new Error(`AI selected an illegal move: ${outcome.error.code}`);
    return { move: proposed, nextState: outcome.state, stats: { level, iterations, solved } };
  };
  const naturalPick = (moves: SearchMove[]) => weightedPick(moves, (m) => Math.exp(4 * m.style), random);
  if (rootAnalysis.forced !== undefined) return finish(naturalPick(rootAnalysis.sensible), true);
  const habitWeight = (move: SearchMove) => {
    const headroom = Math.max(1, game.config.targetRooms - game.rooms);
    const intent = game.config.rule === 'race' ? move.gain / headroom : -move.gain / headroom;
    return Math.exp(4 * move.style + 1.8 * intent);
  };
  if (level === 'easy') return finish(weightedPick(rootAnalysis.sensible, habitWeight, random));

  const makeNode = (position: SearchPosition, analysis: PositionAnalysis): Node => ({
    position, analysis, visits: 0,
    edges: shortlist(analysis.sensible, settings.width, random).map((move) => ({ move, visits: 0, total: 0 })),
  });
  const root = makeNode(model.initial, rootAnalysis);
  const known = new Map<number, number>();

  // Solve small finite endgames exactly. Timeout never caches a partial answer as exact.
  if (level === 'hard' && rootAnalysis.sensible.length <= 12) {
    const exactDeadline = Math.min(deadline, Date.now() + Math.max(0, (deadline - Date.now()) * 0.5));
    const memo = new Map<string, number>();
    const solve = (position: SearchPosition): number => {
      if (Date.now() >= exactDeadline) throw TIMEOUT;
      if (position.winner !== undefined) return valueFor(position.winner, position.turn);
      const key = [...position.played].sort((a, b) => a - b).join(',');
      const cached = memo.get(key); if (cached !== undefined) return cached;
      const analysis = model.analyze(position, () => { if (Date.now() >= exactDeadline) throw TIMEOUT; });
      if (analysis.forced !== undefined) { const value = valueFor(analysis.forced, position.turn); memo.set(key, value); return value; }
      let best = -1;
      for (const move of analysis.sensible) {
        best = Math.max(best, -solve(model.advance(position, move)));
        if (best === 1) break;
      }
      memo.set(key, best); return best;
    };
    try {
      for (const move of rootAnalysis.sensible) known.set(move.id, -solve(model.advance(model.initial, move)));
      const best = Math.max(...known.values());
      return finish(naturalPick(rootAnalysis.sensible.filter((m) => known.get(m.id) === best)), true);
    } catch (error) { if (error !== TIMEOUT) throw error; }
    const wins = rootAnalysis.sensible.filter((m) => known.get(m.id) === 1);
    if (wins.length) return finish(naturalPick(wins), true);
  }

  // Check every shortlisted reply before statistical search, so an obvious trap has a firm value.
  try {
    for (const edge of root.edges) {
      checkBudget();
      const position = model.advance(root.position, edge.move);
      const analysis = model.analyze(position, checkBudget);
      edge.child = makeNode(position, analysis);
      edge.known = known.get(edge.move.id);
      if (analysis.forced !== undefined) edge.known = valueFor(analysis.forced, game.turn);
    }
  } catch (error) { if (error !== TIMEOUT) throw error; }
  const immediateTactics = root.edges.filter((e) => e.known === 1);
  if (immediateTactics.length) return finish(naturalPick(immediateTactics.map((e) => e.move)), true);

  const rollout = (initial: SearchPosition): number => {
    let position = initial;
    for (let depth = 0; depth < settings.rolloutDepth; depth++) {
      checkBudget();
      const analysis = model.analyze(position, checkBudget);
      if (analysis.forced !== undefined) return valueFor(analysis.forced, game.turn);
      // Both simulated players recognize immediate wins and avoid immediately losing cuts.
      const move = weightedPick(analysis.sensible, (m) => Math.exp(1.5 * m.style), random);
      position = model.advance(position, move);
    }
    return 0; // Unresolved horizon, never reported as a proven draw.
  };
  const maxIterations = Math.max(0, options.maxIterations ?? settings.iterations);
  try {
    while (iterations < maxIterations) {
      checkBudget();
      let node = root;
      const path: { node: Node; edge: Edge }[] = [];
      let result: number;
      while (true) {
        checkBudget();
        if (node.analysis.forced !== undefined) { result = valueFor(node.analysis.forced, game.turn); break; }
        const sign = node.position.turn === game.turn ? 1 : -1;
        let selected = node.edges[0], best = -Infinity;
        for (const edge of node.edges) {
          const mean = edge.known ?? (edge.visits ? edge.total / edge.visits : 0);
          const exploration = 1.2 * Math.sqrt(Math.log(node.visits + 2) / (edge.visits + 1));
          const prior = (0.15 + 0.15 * edge.move.style) / (edge.visits + 1);
          const score = sign * mean + exploration + prior + random() * 0.0001;
          if (score > best) { best = score; selected = edge; }
        }
        path.push({ node, edge: selected });
        if (selected.known !== undefined) { result = selected.known; break; }
        if (!selected.child) {
          const position = model.advance(node.position, selected.move);
          selected.child = makeNode(position, model.analyze(position, checkBudget));
          result = selected.child.analysis.forced !== undefined
            ? valueFor(selected.child.analysis.forced, game.turn) : rollout(position);
          break;
        }
        if (selected.visits === 0) { result = rollout(selected.child.position); break; }
        node = selected.child;
      }
      // An interrupted rollout does not count as a draw or change the root estimates.
      for (const entry of path) { entry.node.visits++; entry.edge.visits++; entry.edge.total += result; }
      iterations++;
    }
  } catch (error) { if (error !== TIMEOUT) throw error; }

  if (!root.edges.some((edge) => edge.visits > 0 || edge.known !== undefined)) {
    return finish(weightedPick(rootAnalysis.sensible, habitWeight, random));
  }
  // Unvisited alternatives remain uncertain, rather than losing to whichever edge was checked first.
  const assessed = root.edges;
  const score = (edge: Edge) => edge.known ?? (edge.visits ? edge.total / edge.visits : 0);
  const best = Math.max(...assessed.map(score));
  const plausible = assessed.filter((edge) => score(edge) >= best - settings.tolerance);
  return finish(weightedPick(plausible, (edge) =>
    Math.exp(3 * edge.move.style + (score(edge) - best) / Math.max(0.03, settings.tolerance)), random).move);
}
