import { useEffect, useMemo, useRef, useState } from 'react';
import { createLineFromPoints } from '../geom';
import { useGameStore } from '../hooks/useGameStore';
import { boardToCanvas, clamp, snapToLattice } from './boardMath';
import { clipLineToBox } from '../geom/clipping';
import type { Point } from '../core';

const PLAYER_COLORS = ['#e74c3c', '#3498db'];
const GRID_COLOR = '#d0d7de';
const AXIS_COLOR = '#adb5bd';
const BACKGROUND_COLOR = '#f9fbfc';
const LINE_WIDTH = 2;
const PREVIEW_COLOR = '#2ecc71';
const SELECTION_COLOR = '#f39c12';
const BOARD_PIXEL_SIZE = 600;

export function GameBoard({ pixelSize = BOARD_PIXEL_SIZE }: { pixelSize?: number }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const game = useGameStore((state) => state.game);
  const selected = useGameStore((state) => state.selected);
  const handlePoint = useGameStore((state) => state.handlePoint);
  const clearSelection = useGameStore((state) => state.clearSelection);
  const [hover, setHover] = useState<Point | null>(null);

  const size = game.config.size;

  const segments = useMemo(() => {
    return game.lines
      .map((line) => clipLineToBox(line, size))
      .filter((segment): segment is { a: Point; b: Point } => Boolean(segment));
  }, [game.lines, size]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }
    const dpr = window.devicePixelRatio ?? 1;
    canvas.style.width = `${pixelSize}px`;
    canvas.style.height = `${pixelSize}px`;
    canvas.width = pixelSize * dpr;
    canvas.height = pixelSize * dpr;
    context.save();
    context.scale(dpr, dpr);
    drawBoard(context, pixelSize, size, segments, selected, hover);
    context.restore();
  }, [pixelSize, size, segments, selected, hover]);

  const handlePointerMove: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width;
    const relY = (event.clientY - rect.top) / rect.height;
    const boardX = clamp(relX, 0, 1) * size;
    const boardY = clamp(1 - relY, 0, 1) * size;
    const snapped = snapToLattice(boardX, boardY, size);
    setHover((prev) =>
      prev && prev.x === snapped.x && prev.y === snapped.y ? prev : snapped,
    );
  };

  const handlePointerLeave: React.PointerEventHandler<HTMLCanvasElement> = () => {
    setHover(null);
  };

  const handlePointerDown: React.PointerEventHandler<HTMLCanvasElement> = (event) => {
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const relX = (event.clientX - rect.left) / rect.width;
    const relY = (event.clientY - rect.top) / rect.height;
    const boardX = clamp(relX, 0, 1) * size;
    const boardY = clamp(1 - relY, 0, 1) * size;
    const snapped = snapToLattice(boardX, boardY, size);
    handlePoint(snapped);
    setHover(null);
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (event) => {
    if (event.key === 'Escape') {
      clearSelection();
      setHover(null);
    }
  };

  return (
    <div className="board-container" tabIndex={0} onKeyDown={handleKeyDown}>
      <canvas
        ref={canvasRef}
        className="game-canvas"
        role="button"
        aria-label="Plane division board"
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        onPointerDown={handlePointerDown}
      />
    </div>
  );
}

function drawBoard(
  ctx: CanvasRenderingContext2D,
  pixelSize: number,
  size: number,
  segments: { a: Point; b: Point }[],
  selected: Point | null,
  hover: Point | null,
) {
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, pixelSize, pixelSize);

  drawGrid(ctx, pixelSize, size);

  segments.forEach((segment, index) => {
    drawSegment(ctx, segment, pixelSize, size, PLAYER_COLORS[index % PLAYER_COLORS.length]);
  });

  if (selected && hover && (selected.x !== hover.x || selected.y !== hover.y)) {
    try {
      const line = createLineFromPoints(selected, hover);
      const preview = clipLineToBox(line, size);
      if (preview) {
        drawSegment(ctx, preview, pixelSize, size, PREVIEW_COLOR, LINE_WIDTH, [6, 4]);
      }
    } catch {
      // Ignore invalid preview directions.
    }
  }

  if (hover) {
    drawHandle(ctx, hover, pixelSize, size, '#34495e');
  }
  if (selected) {
    drawHandle(ctx, selected, pixelSize, size, SELECTION_COLOR, 6);
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, pixelSize: number, size: number) {
  const cell = pixelSize / size;
  ctx.lineWidth = 1;
  ctx.strokeStyle = GRID_COLOR;
  ctx.beginPath();
  for (let i = 0; i <= size; i += 1) {
    const x = i * cell;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, pixelSize);
  }
  ctx.stroke();

  ctx.strokeStyle = GRID_COLOR;
  ctx.beginPath();
  for (let j = 0; j <= size; j += 1) {
    const y = pixelSize - j * cell;
    ctx.moveTo(0, y);
    ctx.lineTo(pixelSize, y);
  }
  ctx.stroke();

  ctx.strokeStyle = AXIS_COLOR;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, pixelSize);
  ctx.lineTo(pixelSize, pixelSize);
  ctx.moveTo(0, 0);
  ctx.lineTo(0, pixelSize);
  ctx.stroke();
}

function drawSegment(
  ctx: CanvasRenderingContext2D,
  segment: { a: Point; b: Point },
  pixelSize: number,
  size: number,
  color: string,
  width = LINE_WIDTH,
  dash: number[] = [],
) {
  const start = boardToCanvas(segment.a, size, pixelSize);
  const end = boardToCanvas(segment.b, size, pixelSize);
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash(dash);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.restore();
}

function drawHandle(
  ctx: CanvasRenderingContext2D,
  point: Point,
  pixelSize: number,
  size: number,
  color: string,
  radius = 4,
) {
  const canvasPoint = boardToCanvas(point, size, pixelSize);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(canvasPoint.x, canvasPoint.y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
