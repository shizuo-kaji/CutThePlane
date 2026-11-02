import { useState } from 'react';
import type { FormEvent } from 'react';
import { canonicalDirections, createInitialState, DEFAULT_DIRECTIONS, directionKey } from '../core';
import type { Direction, GameConfig } from '../core';
import { useGameStore } from '../hooks/useGameStore';
import { Modal } from './Modal';
import { DirectionIcon, directionLabel } from './DirectionIcon';

const PRESETS: { name: string; label: string; detail: string; patch: Partial<GameConfig> }[] = [
  { name: 'classic', label: 'Classic board', detail: 'The original game', patch: { scoring: 'board', rule: 'avoidance', allowTriplePoints: true, capacities: null } },
  { name: 'simple', label: 'Simple plane', detail: 'No triple intersections', patch: { scoring: 'plane', rule: 'avoidance', allowTriplePoints: false, capacities: null } },
  { name: 'race', label: 'Race', detail: 'Be first to the target', patch: { scoring: 'plane', rule: 'race', allowTriplePoints: false, capacities: null } },
  { name: 'capacity', label: 'Limited lines', detail: 'Three per direction', patch: { scoring: 'plane', rule: 'avoidance', allowTriplePoints: true } },
];

export function Controls({ onClose }: { onClose(): void }) {
  const game = useGameStore((s) => s.game);
  const currentPlayers = useGameStore((s) => s.aiPlayers);
  const start = useGameStore((s) => s.startNewGame);
  const [draft, setDraft] = useState<GameConfig>({ ...game.config });
  const [players, setPlayers] = useState<[boolean, boolean]>([...currentPlayers]);
  const originalDirections = game.config.directions.map(directionKey).join(';');
  const [custom, setCustom] = useState(![DEFAULT_DIRECTIONS, DEFAULT_DIRECTIONS.slice(0, 2)].some((dirs) => dirs.map(directionKey).join(';') === originalDirections));
  const [directionText, setDirectionText] = useState(game.config.directions.map(directionKey).join('; '));
  const [error, setError] = useState('');
  const update = (patch: Partial<GameConfig>) => { setDraft((value) => ({ ...value, ...patch })); setError(''); };
  const changeDirections = (directions: Direction[]) => {
    update({ directions, capacities: draft.capacities ? Object.fromEntries(directions.map((d) => [directionKey(d), draft.capacities?.[directionKey(d)] ?? 3])) : null });
    setDirectionText(directions.map(directionKey).join('; '));
  };
  const parseCustom = (text: string) => {
    const pieces = text.trim().split(/[;\s]+/).filter(Boolean);
    if (!pieces.length || pieces.some((p) => !/^-?\d+,-?\d+$/.test(p))) throw new Error('Use integer pairs separated by semicolons, for example 1,0; 0,1; 1,1.');
    return canonicalDirections(pieces.map((p) => { const [dx, dy] = p.split(',').map(Number); return { dx, dy }; }));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    try {
      let directions = draft.directions;
      if (custom) {
        directions = parseCustom(directionText);
      }
      const config = { ...draft, directions, capacities: draft.capacities ? Object.fromEntries(directions.map((d) => [directionKey(d), draft.capacities?.[directionKey(d)] ?? 3])) : null };
      createInitialState(config);
      start(config, players);
      onClose();
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Please check the settings.'); }
  };
  return <Modal open title="Make it your game" onClose={onClose} wide>
    <form onSubmit={submit}>
      <div className="modal-body settings-body">
        <p className="muted">Choose a starting point, then make your own combination.</p>
        <div className="preset-grid">{PRESETS.map((preset) => <button key={preset.name} type="button" className="preset-option" onClick={() => update({ ...preset.patch, ...(preset.name === 'capacity' ? { capacities: Object.fromEntries(draft.directions.map((d) => [directionKey(d), 3])) } : {}) })}>
          <strong>{preset.label}</strong><span>{preset.detail}</span>
        </button>)}</div>
        <div className="settings-grid">
          <fieldset><legend>01 · Winning rule</legend><div className="choice-row">
            <button type="button" className={draft.rule === 'avoidance' ? 'choice active' : 'choice'} aria-pressed={draft.rule === 'avoidance'} onClick={() => update({ rule: 'avoidance' })}><strong>Avoidance</strong><span>Reach the target → lose</span></button>
            <button type="button" className={draft.rule === 'race' ? 'choice active' : 'choice'} aria-pressed={draft.rule === 'race'} onClick={() => update({ rule: 'race' })}><strong>Race</strong><span>Reach the target → win</span></button>
          </div></fieldset>
          <fieldset><legend>02 · Count rooms in</legend><div className="choice-row">
            <button type="button" className={draft.scoring === 'board' ? 'choice active' : 'choice'} aria-pressed={draft.scoring === 'board'} onClick={() => update({ scoring: 'board' })}><strong>The board</strong><span>Only inside the square</span></button>
            <button type="button" className={draft.scoring === 'plane' ? 'choice active' : 'choice'} aria-pressed={draft.scoring === 'plane'} onClick={() => update({ scoring: 'plane' })}><strong>The whole plane</strong><span>Includes off-board rooms</span></button>
          </div></fieldset>
          <fieldset><legend>03 · Intersections</legend><label className="toggle-line"><input type="checkbox" checked={draft.allowTriplePoints} onChange={(e) => update({ allowTriplePoints: e.target.checked })} /><span>Allow three or more lines at one point</span></label><p className="field-note">When off, triple intersections are forbidden everywhere, including outside the board.</p></fieldset>
          <fieldset><legend>04 · Target & board</legend><div className="input-row"><label>Target rooms M<input type="number" min="2" max="10000" required value={Number.isNaN(draft.targetRooms) ? '' : draft.targetRooms} onChange={(e) => update({ targetRooms: e.target.valueAsNumber })} /></label><label>Board size<input type="number" min="2" max="61" required value={Number.isNaN(draft.size) ? '' : draft.size} onChange={(e) => update({ size: e.target.valueAsNumber })} /></label></div></fieldset>
          <fieldset className="full-width"><legend>05 · Directions & capacities</legend><div className="direction-settings"><label>Allowed directions<select value={custom ? 'custom' : draft.directions.length === 2 ? 'orthogonal' : 'diagonals'} onChange={(e) => {
            if (e.target.value === 'custom') setCustom(true);
            else { setCustom(false); changeDirections(e.target.value === 'orthogonal' ? DEFAULT_DIRECTIONS.slice(0, 2) : DEFAULT_DIRECTIONS); }
          }}><option value="orthogonal">Horizontal + vertical</option><option value="diagonals">Horizontal + vertical + diagonals</option><option value="custom">Custom directions</option></select></label>
          <label className="toggle-line"><input type="checkbox" checked={draft.capacities !== null} onChange={(e) => update({ capacities: e.target.checked ? Object.fromEntries(draft.directions.map((d) => [directionKey(d), 3])) : null })} />Limit lines per direction</label></div>
          {custom && <label className="custom-input">Direction vectors (dx,dy)<input value={directionText} onChange={(e) => {
            const text = e.target.value; setDirectionText(text); setError('');
            try {
              const dirs = parseCustom(text);
              if (dirs.length <= 8) update({ directions: dirs, capacities: draft.capacities ? Object.fromEntries(dirs.map((d) => [directionKey(d), draft.capacities?.[directionKey(d)] ?? 3])) : null });
            } catch { /* Keep the draft while an integer pair is still being typed. */ }
          }} placeholder="1,0; 0,1; 1,1; 1,-1" /><span className="field-note">Up to 8 integer directions. New custom directions start with capacity 3 when limits are enabled.</span></label>}
          {draft.capacities && <div className="capacity-inputs">{draft.directions.map((d) => <label key={directionKey(d)}><span><DirectionIcon direction={d} /><span>{directionLabel(d)}</span></span><input aria-label={`Capacity: ${directionLabel(d)}`} type="number" min="0" max="1000" required value={Number.isNaN(draft.capacities?.[directionKey(d)]) ? '' : draft.capacities?.[directionKey(d)] ?? 3} onChange={(e) => update({ capacities: { ...draft.capacities, [directionKey(d)]: e.target.valueAsNumber } })} /></label>)}</div>}
          <p className="field-note">Capacities are shared by both players. If all lines are used below the target, the game is a draw.</p></fieldset>
          <fieldset className="full-width"><legend>06 · Players</legend><div className="input-row">{([0, 1] as const).map((p) => <label key={p}>Player {p + 1}<select value={players[p] ? 'computer' : 'human'} onChange={(e) => { const next = [...players] as [boolean, boolean]; next[p] = e.target.value === 'computer'; setPlayers(next); }}><option value="human">Human</option><option value="computer">Computer</option></select></label>)}</div></fieldset>
        </div>
        <p className="field-note">Choose drawing points inside the original square in every mode. Whole-plane mode zooms out to show off-board intersections. If no allowed cut remains below the target, the game is a draw, even if some capacity is left.</p>
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
      <footer className="modal-footer"><span className="field-note">{game.moveNumber ? 'Starting replaces the current game.' : 'Settings apply when you start.'}</span><button className="secondary" type="button" onClick={onClose}>Cancel</button><button className="primary" type="submit">Start game <span aria-hidden="true">↗</span></button></footer>
    </form>
  </Modal>;
}
