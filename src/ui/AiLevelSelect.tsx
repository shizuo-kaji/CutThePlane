import { useId } from 'react';
import { AI_LEVEL_KEYS, AI_LEVELS } from '../ai/levels';
import type { AiLevel } from '../ai/levels';
import type { PlayerIndex } from '../core';

export function AiLevelSelect({ player, value, onChange, compact = false }: {
  player: PlayerIndex; value: AiLevel; onChange(level: AiLevel): void; compact?: boolean;
}) {
  const descriptionId = useId();
  return <div className={`ai-level-control${compact ? ' compact' : ''}`}>
    <label><span>Level</span><select aria-label={`Player ${player + 1} AI level`}
      aria-describedby={compact ? undefined : descriptionId}
      title={AI_LEVELS[value].description} value={value}
      onChange={(event) => onChange(event.target.value as AiLevel)}>
      {AI_LEVEL_KEYS.map((level) => <option key={level} value={level}>{AI_LEVELS[level].label}</option>)}
    </select></label>
    {!compact && <p className="field-note" id={descriptionId}>{AI_LEVELS[value].description}</p>}
  </div>;
}
