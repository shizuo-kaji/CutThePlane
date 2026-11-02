import type { GameState } from '../core';
import { chooseBestMove } from './greedy';

self.onmessage = (event: MessageEvent<GameState>) => {
  try {
    self.postMessage({ move: chooseBestMove(event.data)?.move ?? null });
  } catch {
    self.postMessage({ error: 'The computer could not finish this turn. You can play it yourself.' });
  }
};
