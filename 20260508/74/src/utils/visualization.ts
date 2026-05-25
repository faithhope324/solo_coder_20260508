import { Point, FEMResult } from '../types';

export const colormap = (value: number, min: number, max: number): string => {
  if (max === min) return '#ffffff';
  
  const t = (value - min) / (max - min);
  const clampedT = Math.max(0, Math.min(1, t));
  
  const r = Math.round(255 * clampedT);
  const g = Math.round(255 * (1 - Math.abs(2 * clampedT - 1)));
  const b = Math.round(255 * (1 - clampedT));
  
  return `rgb(${r}, ${g}, ${b})`;
};

export const colormapViridis = (value: number, min: number, max: number): string => {
  if (max === min) return '#440154';
  
  const t = (value - min) / (max - min);
  const clampedT = Math.max(0, Math.min(1, t));
  
  const colors = [
    [68, 1, 84],
    [72, 35, 116],
    [62, 73, 137],
    [49, 104, 142],
    [38, 130, 142],
    [31, 158, 137],
    [53, 183, 121],
    [109, 205, 89],
    [180, 222, 44],
    [253, 231, 37],
  ];
  
  const idx = clampedT * (colors.length - 1);
  const lowIdx = Math.floor(idx);
  const highIdx = Math.min(lowIdx + 1, colors.length - 1);
  const frac = idx - lowIdx;
  
  const r = Math.round(colors[lowIdx][0] + frac * (colors[highIdx][0] - colors[lowIdx][0]));
  const g = Math.round(colors[lowIdx][1] + frac * (colors[highIdx][1] - colors[lowIdx][1]));
  const b = Math.round(colors[lowIdx][2] + frac * (colors[highIdx][2] - colors[lowIdx][2]));
  
  return `rgb(${r}, ${g}, ${b})`;
};

export const colormapBlueWhiteRed = (value: number, min: number, max: number): string => {
  if (max === min) return '#ffffff';
  
  const t = (value - min) / (max - min);
  const clampedT = Math.max(0, Math.min(1, t));
  
  if (clampedT < 0.5) {
    const t2 = clampedT * 2;
    const r = Math.round(255 * t2);
    const g = Math.round(255 * t2);
    const b = 255;
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t2 = (clampedT - 0.5) * 2;
    const r = 255;
    const g = Math.round(255 * (1 - t2));
    const b = Math.round(255 * (1 - t2));
    return `rgb(${r}, ${g}, ${b})`;
  }
};

export const generateContourLevels = (min: number, max: number, count: number): number[] => {
  const levels: number[] = [];
  const step = (max - min) / (count - 1);
  for (let i = 0; i < count; i++) {
    levels.push(min + i * step);
  }
  return levels;
};

interface MarchingSquareCell {
  x: number;
  y: number;
  values: [number, number, number, number];
}

export const marchingSquares = (
  data: number[][],
  level: number,
  cellSize: number = 1
): { start: Point; end: Point }[] => {
  const segments: { start: Point; end: Point }[] = [];
  const height = data.length;
  const width = data[0].length;
  
  const edgeTable = [
    [],
    [[0, 3]],
    [[0, 1]],
    [[1, 3]],
    [[1, 2]],
    [[0, 1], [2, 3]],
    [[0, 2]],
    [[2, 3]],
    [[2, 3]],
    [[0, 2]],
    [[0, 3], [1, 2]],
    [[1, 2]],
    [[1, 3]],
    [[0, 1]],
    [[0, 3]],
    [],
  ];
  
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      let index = 0;
      const v0 = data[y][x];
      const v1 = data[y][x + 1];
      const v2 = data[y + 1][x + 1];
      const v3 = data[y + 1][x];
      
      if (v0 < level) index |= 1;
      if (v1 < level) index |= 2;
      if (v2 < level) index |= 4;
      if (v3 < level) index |= 8;
      
      const edges = edgeTable[index];
      if (!edges) continue;
      
      const interpolate = (v1: number, v2: number, p1: Point, p2: Point): Point => {
        if (Math.abs(v2 - v1) < 1e-10) return p1;
        const t = (level - v1) / (v2 - v1);
        return {
          x: p1.x + t * (p2.x - p1.x),
          y: p1.y + t * (p2.y - p1.y),
        };
      };
      
      const corners = [
        { x: x * cellSize, y: y * cellSize },
        { x: (x + 1) * cellSize, y: y * cellSize },
        { x: (x + 1) * cellSize, y: (y + 1) * cellSize },
        { x: x * cellSize, y: (y + 1) * cellSize },
      ];
      
      const values = [v0, v1, v2, v3];
      
      for (const [a, b] of edges) {
        const start = interpolate(values[a], values[b], corners[a], corners[b]);
        segments.push({ start, end: start });
      }
    }
  }
  
  return segments;
};

export const interpolateToGrid = (
  result: FEMResult,
  gridSize: number
): { data: number[][]; xMin: number; xMax: number; yMin: number; yMax: number } => {
  const { nodes, potential } = result;
  
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  
  const data: number[][] = [];
  
  for (let gi = 0; gi < gridSize; gi++) {
    const row: number[] = [];
    for (let gj = 0; gj < gridSize; gj++) {
      const x = xMin + (gj / (gridSize - 1)) * (xMax - xMin);
      const y = yMin + (gi / (gridSize - 1)) * (yMax - yMin);
      
      let minDist = Infinity;
      let nearestV = 0;
      
      for (let i = 0; i < nodes.length; i++) {
        const dx = x - nodes[i].x;
        const dy = y - nodes[i].y;
        const dist = dx * dx + dy * dy;
        
        if (dist < minDist) {
          minDist = dist;
          nearestV = potential[i];
        }
      }
      
      row.push(nearestV);
    }
    data.push(row);
  }
  
  return { data, xMin, xMax, yMin, yMax };
};

export const drawArrow = (
  ctx: CanvasRenderingContext2D,
  from: Point,
  to: Point,
  color: string,
  lineWidth: number = 1,
  headLen: number = 8
) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const angle = Math.atan2(dy, dx);
  
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.fillStyle = color;
  
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
  
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(
    to.x - headLen * Math.cos(angle - Math.PI / 6),
    to.y - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    to.x - headLen * Math.cos(angle + Math.PI / 6),
    to.y - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
};

export const formatScientific = (value: number, precision: number = 4): string => {
  if (Math.abs(value) < 1e-10) return '0';
  if (Math.abs(value) >= 0.01 && Math.abs(value) < 10000) {
    return value.toFixed(precision);
  }
  return value.toExponential(precision);
};

export const getPotentialStats = (result: FEMResult) => {
  const { potential, electricField } = result;
  const minV = Math.min(...potential);
  const maxV = Math.max(...potential);
  
  const eMagnitudes = electricField.map(e => Math.sqrt(e.x * e.x + e.y * e.y));
  const maxE = Math.max(...eMagnitudes);
  const avgE = eMagnitudes.reduce((a, b) => a + b, 0) / eMagnitudes.length;
  
  return { minV, maxV, maxE, avgE };
};

export const drawColorBar = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  min: number,
  max: number,
  colormapFn: (v: number, min: number, max: number) => string = colormapBlueWhiteRed
) => {
  const gradient = ctx.createLinearGradient(x, y, x, y + height);
  
  const nStops = 20;
  for (let i = 0; i <= nStops; i++) {
    const t = i / nStops;
    const value = min + t * (max - min);
    gradient.addColorStop(t, colormapFn(value, min, max));
  }
  
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
  
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  
  ctx.fillStyle = '#f1f5f9';
  ctx.font = '11px JetBrains Mono, monospace';
  ctx.textAlign = 'left';
  
  ctx.fillText(formatScientific(max, 2), x + width + 8, y + 8);
  ctx.fillText(formatScientific((max + min) / 2, 2), x + width + 8, y + height / 2 + 4);
  ctx.fillText(formatScientific(min, 2), x + width + 8, y + height - 4);
  
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px JetBrains Mono, monospace';
  ctx.fillText('V', x + width + 8, y + height + 16);
};
