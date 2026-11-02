export type AiLevel = 'easy' | 'normal' | 'hard';

export const AI_LEVELS = {
  easy: {
    label: 'Easy',
    description: 'Plays by instinct. Spots obvious wins, but misses traps.',
    timeMs: 80, iterations: 0, width: 16, rolloutDepth: 12, tolerance: 0.4,
  },
  normal: {
    label: 'Standard',
    description: 'Looks ahead, weighs your replies, and varies its play.',
    timeMs: 500, iterations: 400, width: 24, rolloutDepth: 24, tolerance: 0.18,
  },
  hard: {
    label: 'Hard',
    description: 'Reads further and plays small endgames precisely.',
    timeMs: 1400, iterations: 1800, width: 48, rolloutDepth: 40, tolerance: 0.05,
  },
} satisfies Record<AiLevel, {
  label: string; description: string; timeMs: number; iterations: number;
  width: number; rolloutDepth: number; tolerance: number;
}>;

export const AI_LEVEL_KEYS = Object.keys(AI_LEVELS) as AiLevel[];
