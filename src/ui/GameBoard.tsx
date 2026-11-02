import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { applyMove, directionKey, directionUsage, moveFromAnchor } from '../core';
import type { Move, Point } from '../core';
import { createLineFromPoints, intersectLines, intersectionKey } from '../geom';
import { clipLineToBox } from '../geom/clipping';
import { useGameStore } from '../hooks/useGameStore';
import { boardViewport, canvasToWorld, clamp, clipToViewport, fitViewport, roomPolygons, snapToLattice, worldToCanvas } from './boardMath';
import { DirectionIcon, directionLabel } from './DirectionIcon';

const COLORS = ['#c75b37', '#3477a5'];
const SHADES = ['#eef3e9', '#f6f0dd', '#eaf1f4', '#f4eae3', '#f5f4ee'];

export function GameBoard() {
  const game = useGameStore((s) => s.game);
  const selected = useGameStore((s) => s.selected);
  const message = useGameStore((s) => s.message);
  const aiPlayers = useGameStore((s) => s.aiPlayers);
  const thinking = useGameStore((s) => s.aiThinking);
  const showLabels = useGameStore((s) => s.showMoveIndices);
  const showRegions = useGameStore((s) => s.showRegions);
  const handlePoint = useGameStore((s) => s.handlePoint);
  const playMove = useGameStore((s) => s.playMove);
  const clearSelection = useGameStore((s) => s.clearSelection);
  const setLabels = useGameStore((s) => s.setShowMoveIndices);
  const setRegions = useGameStore((s) => s.setShowRegions);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const press = useRef<Point | null>(null);
  const [pixels, setPixels] = useState(600);
  const [hover, setHover] = useState<Point | null>(null);
  const [keyboardPoint, setKeyboardPoint] = useState<Point>({ x: Math.floor(game.config.size / 2), y: Math.floor(game.config.size / 2) });
  const [direction, setDirection] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'fit' | 'board'>('fit');
  const [keyboardActive, setKeyboardActive] = useState(false);
  const { size, scoring } = game.config;
  const interactive = game.status === 'playing' && !aiPlayers[game.turn];
  const activeDirection = game.config.directions.find((d) => directionKey(d) === direction);
  const cursor = hover ?? (keyboardActive ? keyboardPoint : null);
  const view = useMemo(() => scoring === 'plane' && viewMode === 'fit' ? fitViewport(size, game.lines) : boardViewport(size), [scoring, size, viewMode, game.lines]);
  const polygons = useMemo(() => showRegions ? roomPolygons(game.lines, scoring === 'board' ? { minX: 0, minY: 0, size } : view) : [], [showRegions, game.lines, scoring, size, view]);
  const move = useMemo<Move | null>(() => {
    if (!interactive || !cursor) return null;
    if (activeDirection) return moveFromAnchor(cursor, activeDirection, size);
    return selected && (selected.x !== cursor.x || selected.y !== cursor.y) ? { a: selected, b: cursor } : null;
  }, [interactive, cursor, selected, activeDirection, size]);
  const preview = useMemo(() => move ? applyMove(game, move, false) : null, [game, move]);
  const dangerous = !!preview && !preview.error && preview.state.winner !== null && preview.state.winner !== game.turn;
  const wins = !!preview && !preview.error && preview.state.winner === game.turn;
  const previewColor = preview?.error ? '#b74735' : dangerous ? '#b27918' : '#28765c';

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const observer = new ResizeObserver(([entry]) => setPixels(Math.max(200, Math.round(entry.contentRect.width))));
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(pixels * dpr); canvas.height = Math.round(pixels * dpr);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#fcfbf6'; ctx.fillRect(0, 0, pixels, pixels);
    const xy = (p: Point) => worldToCanvas(p, view, pixels);
    for (const [index, polygon] of polygons.entries()) {
      ctx.beginPath();
      polygon.forEach((p, i) => { const c = xy(p); if (!i) ctx.moveTo(c.x, c.y); else ctx.lineTo(c.x, c.y); });
      ctx.closePath(); ctx.fillStyle = SHADES[index % SHADES.length]; ctx.fill();
    }
    const cell = pixels / view.size;
    // Only original-board lattice points are selectable. Do not imply otherwise after fitting.
    ctx.strokeStyle = '#dfe3da'; ctx.lineWidth = 0.7;
    for (let n = 0; n <= size; n++) {
      const a = xy({ x: n, y: 0 }), b = xy({ x: n, y: size });
      const c = xy({ x: 0, y: n }), d = xy({ x: size, y: n });
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
    }
    if (cell >= 9) {
      ctx.fillStyle = '#c3c9bc';
      for (let x = 0; x <= size; x++) for (let y = 0; y <= size; y++) {
        const p = xy({ x, y }); ctx.beginPath(); ctx.arc(p.x, p.y, 1.25, 0, Math.PI * 2); ctx.fill();
      }
    }
    const low = xy({ x: 0, y: 0 }), high = xy({ x: size, y: size });
    ctx.strokeStyle = '#a8b09e'; ctx.lineWidth = 1.4;
    ctx.setLineDash(scoring === 'plane' ? [5, 5] : []);
    ctx.strokeRect(low.x, high.y, high.x - low.x, low.y - high.y); ctx.setLineDash([]);
    const drawLine = (segment: { a: Point; b: Point }, color: string, width: number, dashed = false) => {
      const a = xy(segment.a), b = xy(segment.b);
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dashed ? [7, 6] : []);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
    };
    const clip = (line: typeof game.lines[number]) => scoring === 'board' ? clipLineToBox(line, size) : clipToViewport(line, view);
    game.lines.forEach((line, index) => {
      const segment = clip(line);
      if (!segment) return;
      const color = COLORS[index % 2];
      if (index === game.lines.length - 1) { ctx.globalAlpha = 0.12; drawLine(segment, color, 9); ctx.globalAlpha = 1; }
      drawLine(segment, color, 2.2);
      if (showLabels) {
        const p = xy(segment.a), end = xy(segment.b);
        const x = clamp(p.x + (end.x - p.x) * 0.035, 14, pixels - 14), y = clamp(p.y + (end.y - p.y) * 0.035, 14, pixels - 14);
        ctx.fillStyle = '#fcfbf6'; ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = color; ctx.font = '600 11px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(index + 1), x, y);
      }
    });
    if (showLabels) {
      const hits = new Map<string, { point: Point; count: number }>();
      for (let i = 0; i < game.lines.length; i++) for (let j = i + 1; j < game.lines.length; j++) {
        const key = intersectionKey(game.lines[i], game.lines[j]);
        if (!key) continue;
        const item = hits.get(key);
        if (item) item.count++; else hits.set(key, { point: intersectLines(game.lines[i], game.lines[j])!, count: 1 });
      }
      for (const { point, count } of hits.values()) if (count >= 3 && (scoring === 'plane' || (point.x >= 0 && point.x <= size && point.y >= 0 && point.y <= size))) {
        const p = xy(point); ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fillStyle = '#263d32'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
    if (move) {
      const segment = clip(createLineFromPoints(move.a, move.b));
      if (segment) drawLine(segment, previewColor, 2.5, true);
    }
    const dot = (point: Point, color: string, r: number) => {
      const p = xy(point); ctx.beginPath(); ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2); ctx.fillStyle = `${color}20`; ctx.fill();
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    };
    if (selected && interactive) dot(selected, COLORS[game.turn], 5);
    if (cursor && interactive) dot(cursor, preview?.error ? '#b74735' : COLORS[game.turn], 4);
    ctx.font = '10px system-ui'; ctx.fillStyle = '#7c8879'; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    const step = Math.max(1, Math.ceil(25 / cell));
    for (let n = 0; n <= size; n += step) {
      const p = xy({ x: n, y: 0 }); ctx.fillText(String(n), p.x, p.y + 8);
    }
  }, [game, size, scoring, pixels, view, polygons, selected, cursor, interactive, move, previewColor, preview?.error, showLabels]);

  const pointerPoint = (event: PointerEvent<HTMLCanvasElement>): Point | null => {
    const rect = event.currentTarget.getBoundingClientRect();
    const world = canvasToWorld({ x: (event.clientX - rect.left) / rect.width, y: (event.clientY - rect.top) / rect.height }, view, 1);
    const tolerance = Math.min(0.45, view.size * 12 / pixels);
    if (world.x < -tolerance || world.x > size + tolerance || world.y < -tolerance || world.y > size + tolerance) return null;
    return snapToLattice(world.x, world.y, size);
  };
  const choose = (point: Point) => {
    if (!interactive) return;
    if (activeDirection) {
      const proposed = moveFromAnchor(point, activeDirection, size);
      if (proposed) playMove(proposed);
    } else handlePoint(point);
    if (useGameStore.getState().game !== game) { setHover(null); setKeyboardActive(false); }
  };
  const keyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === 'Escape') { event.preventDefault(); clearSelection(); setHover(null); setKeyboardActive(false); return; }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault(); setKeyboardActive(true); setHover(null);
      setKeyboardPoint((p) => ({ x: clamp(p.x + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0), 0, size), y: clamp(p.y + (event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : 0), 0, size) }));
    } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setKeyboardActive(true); choose(keyboardPoint); }
  };
  let feedback = game.status === 'finished' ? 'Game finished. Explore the board or start a new game.' : thinking ? 'Computer is finding its next cut…' : !interactive ? 'Computer turn.' : selected ? 'Choose a second point. Escape cancels.' : activeDirection ? 'Choose a lattice point to cut in this direction.' : 'Choose a point, then a second. Your line extends across the board.';
  if (preview?.error) feedback = preview.error.message;
  else if (preview) feedback = `+${preview.state.rooms - game.rooms} room${preview.state.rooms - game.rooms === 1 ? '' : 's'} → ${preview.state.rooms} total${wins ? ' · This move wins!' : dangerous ? ' · This move loses!' : preview.state.endReason === 'capacity' ? ' · This move draws.' : ''}`;
  else if (message) feedback = message;
  else if (interactive && activeDirection && cursor && !move) feedback = 'This direction needs a second lattice point inside the square. Try another anchor.';
  const feedbackError = preview ? Boolean(preview.error) : Boolean(message);

  return <section className="board-section" aria-label="Game board">
    <div className="board-toolbar"><div className="board-title"><span className={`turn-dot player-${game.turn}`} /><strong>{scoring === 'plane' ? 'The whole plane' : 'Your playing field'}</strong></div><div className="view-controls" aria-label="Board view">{scoring === 'plane' ? <><button className={viewMode === 'board' ? 'active' : ''} aria-pressed={viewMode === 'board'} onClick={() => setViewMode('board')}>Board</button><button className={viewMode === 'fit' ? 'active' : ''} aria-pressed={viewMode === 'fit'} onClick={() => setViewMode('fit')}>Fit all ↗</button></> : <span>{size} × {size} GRID</span>}</div></div>
    <div className="board-frame" ref={frameRef}><canvas ref={canvasRef} className="game-canvas" tabIndex={0} role="application" aria-label={`Plane division board, ${game.rooms} rooms. Player ${game.turn + 1}.`} aria-describedby="board-instructions board-feedback" onKeyDown={keyDown} onFocus={() => setKeyboardActive(true)} onBlur={() => setKeyboardActive(false)}
      onPointerMove={(e) => { if (e.pointerType !== 'touch') { setKeyboardActive(false); setHover(pointerPoint(e)); } }} onPointerLeave={() => setHover(null)}
      onPointerDown={(e) => { if (e.button !== 0) return; press.current = { x: e.clientX, y: e.clientY }; if (e.pointerType === 'mouse') e.currentTarget.focus({ preventScroll: true }); }}
      onPointerCancel={() => { press.current = null; }} onPointerUp={(e) => {
        const start = press.current; press.current = null;
        if (!start || Math.hypot(start.x - e.clientX, start.y - e.clientY) > 12) return;
        const point = pointerPoint(e); if (point) { setKeyboardPoint(point); choose(point); } setHover(null); setKeyboardActive(false);
      }} /></div>
    <div id="board-feedback" className={`board-feedback${feedbackError ? ' error' : dangerous ? ' warning' : wins ? ' winning' : ''}`} role="status" aria-live="polite"><span className={thinking ? 'thinking-dot' : ''} aria-hidden="true">{thinking ? '◌' : feedbackError ? '!' : wins ? '★' : '↗'}</span><span>{feedback}</span>{selected && <button className="text-button" onClick={clearSelection}>Cancel</button>}</div>
    <div className="drawing-tools"><span className="tool-label">DRAW WITH</span><div className="direction-buttons" role="group" aria-label="Drawing method"><button className={!activeDirection ? 'active' : ''} aria-pressed={!activeDirection} onClick={() => { setDirection(null); clearSelection(); }}>Two points</button>{game.config.directions.map((d) => {
      const key = directionKey(d), cap = game.config.capacities?.[key] ?? Infinity;
      return <button key={key} title={directionLabel(d)} aria-label={`Draw ${directionLabel(d)}`} aria-pressed={direction === key} disabled={directionUsage(game, d) >= cap} className={direction === key ? 'active' : ''} onClick={() => { setDirection(key); clearSelection(); }}><DirectionIcon direction={d} /></button>;
    })}</div><div className="display-options"><label><input type="checkbox" checked={showRegions} onChange={(e) => setRegions(e.target.checked)} />Room tint</label><label><input type="checkbox" checked={showLabels} onChange={(e) => setLabels(e.target.checked)} />Labels</label></div></div>
    <p className="board-footnote" id="board-instructions">{scoring === 'plane' ? `All regions count, including off-screen ones. ${viewMode === 'fit' ? 'Auto-fit shows every intersection.' : 'Board view is for precise input.'} The dashed square is the input area.` : 'Only rooms inside the square count.'}<span>Arrows to move · Enter to select · Esc to cancel</span></p>
    <span className="sr-only" aria-live="polite">{keyboardActive ? `Cursor: ${keyboardPoint.x}, ${keyboardPoint.y}` : ''}</span>
  </section>;
}
