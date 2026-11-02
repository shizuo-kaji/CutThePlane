import type { GameState } from '../core';
import { chooseMove } from './search';
import type { AiLevel } from './levels';

export interface AiRequest { game: GameState; level: AiLevel }

self.onmessage = (event: MessageEvent<AiRequest>) => {
  try {
    self.postMessage({ move: chooseMove(event.data.game, event.data.level)?.move ?? null });
  } catch {
    self.postMessage({ error: 'The computer could not finish this turn. You can play it yourself.' });
  }
};
