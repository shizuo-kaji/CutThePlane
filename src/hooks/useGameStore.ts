import { create } from 'zustand';
import type { AiLevel } from '../ai/levels';
import { applyMove, createInitialState, settleAvailability } from '../core';
import type { GameConfig, GameState, Move, PlayerIndex, Point } from '../core';

interface GameStoreState {
  game: GameState;
  round: number;
  selected: Point | null;
  message: string | null;
  aiPlayers: [boolean, boolean];
  aiLevels: [AiLevel, AiLevel];
  aiRevision: number;
  aiThinking: boolean;
  showMoveIndices: boolean;
  showRegions: boolean;
  clearSelection(): void;
  handlePoint(point: Point): void;
  playMove(move: Move): void;
  startNewGame(config?: GameConfig, aiPlayers?: [boolean, boolean], aiLevels?: [AiLevel, AiLevel]): void;
  setAiPlayer(player: PlayerIndex, enabled: boolean): void;
  setAiLevel(player: PlayerIndex, level: AiLevel): void;
  setThinking(value: boolean): void;
  acceptAiMove(expected: GameState, move: Move | null, revision: number): void;
  failAi(expected: GameState, message: string, revision: number): void;
  setShowMoveIndices(value: boolean): void;
  setShowRegions(value: boolean): void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  game: createInitialState(), round: 0, selected: null, message: null,
  aiPlayers: [false, false], aiLevels: ['normal', 'normal'], aiRevision: 0, aiThinking: false, showMoveIndices: true, showRegions: true,
  clearSelection() { set({ selected: null, message: null }); },
  handlePoint(point) {
    const { selected, game, aiPlayers } = get();
    if (game.status !== 'playing' || aiPlayers[game.turn]) return;
    if (!selected) { set({ selected: { ...point }, message: null }); return; }
    if (selected.x === point.x && selected.y === point.y) { get().clearSelection(); return; }
    get().playMove({ a: selected, b: point });
  },
  playMove(move) {
    const { game, aiPlayers } = get();
    if (game.status !== 'playing' || aiPlayers[game.turn]) return;
    const outcome = applyMove(game, move);
    if (outcome.error) { set({ message: outcome.error.message }); return; }
    set({ game: outcome.state, selected: null, message: null });
  },
  startNewGame(config, aiPlayers, aiLevels) {
    const game = createInitialState(config ?? get().game.config);
    set({ game, round: get().round + 1, aiPlayers: aiPlayers ?? get().aiPlayers, aiLevels: aiLevels ?? get().aiLevels, aiRevision: get().aiRevision + 1, selected: null, message: null, aiThinking: false });
  },
  setAiPlayer(player, enabled) {
    const next = [...get().aiPlayers] as [boolean, boolean];
    next[player] = enabled;
    set({ aiPlayers: next, aiRevision: get().aiRevision + 1, selected: null, message: null, aiThinking: false });
  },
  setAiLevel(player, level) {
    if (get().aiLevels[player] === level) return;
    const levels = [...get().aiLevels] as [AiLevel, AiLevel];
    levels[player] = level;
    set({ aiLevels: levels, aiRevision: get().aiRevision + 1, aiThinking: false, message: null });
  },
  setThinking(aiThinking) { set({ aiThinking }); },
  acceptAiMove(expected, move, revision) {
    const { game, aiPlayers } = get();
    if (game !== expected || get().aiRevision !== revision || !aiPlayers[game.turn] || game.status !== 'playing') return;
    if (!move) {
      const settled = settleAvailability(game);
      if (settled.status === 'playing') { get().failAi(expected, 'The computer could not choose a move. This turn is now yours.', revision); return; }
      set({ game: settled, aiThinking: false, selected: null });
      return;
    }
    const outcome = applyMove(game, move);
    if (outcome.error) { get().failAi(expected, outcome.error.message, revision); return; }
    set({ game: outcome.state, selected: null, message: null, aiThinking: false });
  },
  failAi(expected, message, revision) {
    if (get().game !== expected || get().aiRevision !== revision) return;
    const next = [...get().aiPlayers] as [boolean, boolean];
    next[expected.turn] = false;
    set({ aiPlayers: next, aiRevision: get().aiRevision + 1, aiThinking: false, message });
  },
  setShowMoveIndices(showMoveIndices) { set({ showMoveIndices }); },
  setShowRegions(showRegions) { set({ showRegions }); },
}));
