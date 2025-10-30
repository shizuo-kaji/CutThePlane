import { create } from 'zustand';
import { applyMove, createInitialState } from '../core';
import type { Direction, GameConfig, GameState, Move, Point } from '../core';
import { normalizeDirection } from '../geom';

type DirectionPresetKey = 'orthogonal' | 'orthogonal-diagonals' | 'custom';

const DIRECTION_PRESETS: Record<DirectionPresetKey, Direction[]> = {
  orthogonal: [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
  ],
  'orthogonal-diagonals': [
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 1, dy: 1 },
    { dx: 1, dy: -1 },
  ],
  custom: [],
};

interface GameStoreState {
  config: GameConfig;
  game: GameState;
  selected: Point | null;
  message: string | null;
  preset: DirectionPresetKey;
  customDirectionsText: string;
  setSelected(point: Point): void;
  clearSelection(): void;
  handlePoint(point: Point): void;
  startNewGame(): void;
  updateTargetRooms(target: number): void;
  updateBoardSize(size: number): void;
  setPreset(preset: DirectionPresetKey): void;
  setCustomDirectionsText(text: string): void;
}

function pointsEqual(a: Point | null, b: Point | null): boolean {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return a.x === b.x && a.y === b.y;
}

function buildInitialState(): {
  config: GameConfig;
  game: GameState;
  preset: DirectionPresetKey;
  customDirectionsText: string;
} {
  const preset: DirectionPresetKey = 'orthogonal-diagonals';
  const config: GameConfig = {
    size: 11,
    targetRooms: 20,
    directions: DIRECTION_PRESETS[preset],
  };
  const game = createInitialState(config);
  return {
    config,
    game,
    preset,
    customDirectionsText: '1,0;0,1;1,1;1,-1',
  };
}

function normalizeDirections(directions: Direction[]): Direction[] {
  const seen = new Set<string>();
  const result: Direction[] = [];
  for (const dir of directions) {
    const norm = normalizeDirection(dir.dx, dir.dy);
    const key = `${norm.dx},${norm.dy}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(norm);
    }
  }
  return result;
}

export const useGameStore = create<GameStoreState>((set, get) => {
  const initial = buildInitialState();
  return {
    config: initial.config,
    game: initial.game,
    selected: null,
    message: null,
    preset: initial.preset,
    customDirectionsText: initial.customDirectionsText,
    setSelected(point) {
      const current = get().selected;
      if (pointsEqual(current, point)) {
        if (get().message !== null) {
          set({ message: null });
        }
        return;
      }
      set({ selected: { ...point }, message: null });
    },
    clearSelection() {
      if (!get().selected) {
        return;
      }
      set({ selected: null });
    },
    handlePoint(point) {
      const { selected, game } = get();
      if (!selected) {
        set({ selected: { ...point }, message: null });
        return;
      }
      if (selected.x === point.x && selected.y === point.y) {
        set({ selected: null, message: null });
        return;
      }
      const move: Move = { a: selected, b: point };
      const outcome = applyMove(game, move);
      if (outcome.error) {
        set({ message: outcome.error.message });
        return;
      }
      set({
        game: outcome.state,
        selected: null,
        message: null,
      });
    },
    startNewGame() {
      const { config } = get();
      const game = createInitialState(config);
      set({
        game,
        selected: null,
        message: null,
      });
    },
    updateTargetRooms(target) {
      if (!Number.isFinite(target) || target < 1) {
        return;
      }
      set((state) => {
        const config: GameConfig = {
          ...state.config,
          targetRooms: Math.floor(target),
        };
        const game: GameState = {
          ...state.game,
          config,
        };
        if (game.rooms >= config.targetRooms && game.status !== 'finished') {
          game.status = 'finished';
          game.loser = game.turn === 0 ? 1 : 0;
        }
        return { config, game };
      });
    },
    updateBoardSize(size) {
      if (!Number.isFinite(size) || size < 2 || size > 61) {
        return;
      }
      set((state) => {
        const nextSize = Math.floor(size);
        const config: GameConfig = {
          ...state.config,
          size: nextSize,
        };
        return {
          config,
          game: createInitialState(config),
          selected: null,
          message: null,
        };
      });
    },
    setPreset(preset) {
      if (preset === 'custom') {
        set({ preset });
        return;
      }
      const directions = DIRECTION_PRESETS[preset];
      set((state) => {
        const config: GameConfig = {
          ...state.config,
          directions,
        };
        return {
          preset,
          config,
          game: createInitialState(config),
          selected: null,
          message: null,
        };
      });
    },
    setCustomDirectionsText(text) {
      set({ customDirectionsText: text, preset: 'custom' });
      const directions = parseDirectionText(text);
      if (!directions) {
        return;
      }
      const normalized = normalizeDirections(directions);
      if (normalized.length === 0) {
        return;
      }
      const config = { ...get().config, directions: normalized };
      set({
        config,
        game: createInitialState(config),
        selected: null,
        message: null,
      });
    },
  };
});

function parseDirectionText(text: string): Direction[] | null {
  const trimmed = text.trim();
  if (!trimmed) {
    return null;
  }
  const parts = trimmed.split(/[\s;]+/).filter(Boolean);
  const result: Direction[] = [];
  for (const part of parts) {
    const [dxStr, dyStr] = part.split(',');
    if (dxStr === undefined || dyStr === undefined) {
      return null;
    }
    const dx = Number(dxStr);
    const dy = Number(dyStr);
    if (!Number.isFinite(dx) || !Number.isFinite(dy) || (dx === 0 && dy === 0)) {
      return null;
    }
    result.push({ dx, dy });
  }
  return result;
}
