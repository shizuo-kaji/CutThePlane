import type { ChangeEvent } from 'react';
import { useGameStore } from '../hooks/useGameStore';

export function Controls() {
  const config = useGameStore((state) => state.config);
  const preset = useGameStore((state) => state.preset);
  const customDirectionsText = useGameStore((state) => state.customDirectionsText);
  const startNewGame = useGameStore((state) => state.startNewGame);
  const updateBoardSize = useGameStore((state) => state.updateBoardSize);
  const updateTargetRooms = useGameStore((state) => state.updateTargetRooms);
  const setPreset = useGameStore((state) => state.setPreset);
  const setCustomDirectionsText = useGameStore((state) => state.setCustomDirectionsText);
  const showMoveIndices = useGameStore((state) => state.showMoveIndices);
  const setShowMoveIndices = useGameStore((state) => state.setShowMoveIndices);

  const handleSizeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value)) {
      updateBoardSize(value);
    }
  };

  const handleTargetChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = Number(event.target.value);
    if (Number.isFinite(value)) {
      updateTargetRooms(value);
    }
  };

  const handlePresetChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as typeof preset;
    setPreset(value);
  };

  const handleMoveIndexToggle = (event: ChangeEvent<HTMLInputElement>) => {
    setShowMoveIndices(event.target.checked);
  };

  return (
    <section className="controls">
      <div className="control-group">
        <label className="control-label" htmlFor="board-size">
          Board Size
        </label>
        <input
          id="board-size"
          type="number"
          min={5}
          max={61}
          value={config.size}
          onChange={handleSizeChange}
        />
      </div>
      <div className="control-group">
        <label className="control-label" htmlFor="target-rooms">
          Target Room Count
        </label>
        <input
          id="target-rooms"
          type="number"
          min={1}
          value={config.targetRooms}
          onChange={handleTargetChange}
        />
      </div>
      <div className="control-group">
        <label className="control-label" htmlFor="direction-preset">
          Admissible Directions
        </label>
        <select id="direction-preset" value={preset} onChange={handlePresetChange}>
          <option value="orthogonal">Orthogonal</option>
          <option value="orthogonal-diagonals">Orthogonal + Diagonals</option>
          <option value="custom">Custom</option>
        </select>
      </div>
      {preset === 'custom' ? (
        <div className="control-group full-width">
          <label className="control-label" htmlFor="custom-directions">
            Custom Directions (dx,dy;…)
          </label>
          <textarea
            id="custom-directions"
            value={customDirectionsText}
            onChange={(event) => setCustomDirectionsText(event.target.value)}
            rows={2}
            placeholder="1,0;0,1;1,1;1,-1"
          />
        </div>
      ) : null}
      <div className="control-group">
        <span className="control-label">Board Labels</span>
        <label className="control-checkbox" htmlFor="show-move-indices">
          <input
            id="show-move-indices"
            type="checkbox"
            checked={showMoveIndices}
            onChange={handleMoveIndexToggle}
          />
          Show
        </label>
      </div>
      <button type="button" className="primary" onClick={startNewGame}>
        New Game
      </button>
    </section>
  );
}
