import type { GridData, WindGridData } from '@/api/weatherApi';

export function getColorScale(variable: string): { min: number; max: number; colors: string[]; unit: string } {
  switch (variable) {
    case 'temperature':
      return {
        min: -30,
        max: 35,
        unit: '°C',
        colors: [
          '#1a0066', '#330099', '#4d4dff', '#66b3ff', '#99ddff',
          '#ccf5ff', '#e6ffee', '#99ff99', '#ccff66', '#ffff00',
          '#ffcc00', '#ff9900', '#ff6600', '#ff3300', '#cc0000',
        ],
      };
    case 'humidity':
      return {
        min: 0,
        max: 25,
        unit: 'hPa',
        colors: [
          '#ffffe0', '#fffacd', '#f0e68c', '#daa520', '#b8860b',
          '#8b6914', '#6b4423', '#4a2511', '#2d150a',
        ],
      };
    case 'wind_speed':
      return {
        min: 0,
        max: 40,
        unit: 'm/s',
        colors: [
          '#e6f9ff', '#b3f0ff', '#80e5ff', '#4ddbff', '#1ad1ff',
          '#00b3b3', '#009966', '#339900', '#99cc00', '#ffff00',
          '#ffcc00', '#ff9933', '#ff6600', '#ff3300', '#cc0000',
        ],
      };
    default:
      return { min: 0, max: 100, unit: '', colors: ['#000', '#fff'] };
  }
}

export function valueToColor(value: number, min: number, max: number, colors: string[]): string {
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const idx = t * (colors.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, colors.length - 1);
  const frac = idx - lo;
  return blendColors(colors[lo], colors[hi], frac);
}

function blendColors(c1: string, c2: string, t: number): string {
  const r1 = parseInt(c1.slice(1, 3), 16);
  const g1 = parseInt(c1.slice(3, 5), 16);
  const b1 = parseInt(c1.slice(5, 7), 16);
  const r2 = parseInt(c2.slice(1, 3), 16);
  const g2 = parseInt(c2.slice(3, 5), 16);
  const b2 = parseInt(c2.slice(5, 7), 16);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r},${g},${b})`;
}

export function drawFilledContour(
  ctx: CanvasRenderingContext2D,
  data: GridData,
  variable: string,
  mapBounds: { north: number; south: number; east: number; west: number },
  canvasWidth: number,
  canvasHeight: number
) {
  const scale = getColorScale(variable);
  const { latMin, latMax, latStep, lonMin, lonMax, lonStep, values } = data;
  const latCount = values.length;
  const lonCount = values[0].length;

  const latToY = (lat: number) =>
    ((mapBounds.north - lat) / (mapBounds.north - mapBounds.south)) * canvasHeight;
  const lonToX = (lon: number) =>
    ((lon - mapBounds.west) / (mapBounds.east - mapBounds.west)) * canvasWidth;

  const cellW = Math.max(2, (lonStep / (mapBounds.east - mapBounds.west)) * canvasWidth);
  const cellH = Math.max(2, (latStep / (mapBounds.north - mapBounds.south)) * canvasHeight);

  for (let i = 0; i < latCount; i++) {
    for (let j = 0; j < lonCount; j++) {
      const lat = latMin + i * latStep;
      const lon = lonMin + j * lonStep;

      if (lat > mapBounds.north || lat < mapBounds.south || lon < mapBounds.west || lon > mapBounds.east) continue;

      const x = lonToX(lon);
      const y = latToY(lat);
      const val = values[i][j];
      ctx.fillStyle = valueToColor(val, scale.min, scale.max, scale.colors);
      ctx.fillRect(x - cellW / 2, y - cellH / 2, cellW + 1, cellH + 1);
    }
  }
}

export function drawContourLines(
  ctx: CanvasRenderingContext2D,
  data: GridData,
  variable: string,
  mapBounds: { north: number; south: number; east: number; west: number },
  canvasWidth: number,
  canvasHeight: number
) {
  const scale = getColorScale(variable);
  const { latMin, latMax, latStep, lonMin, lonStep, values } = data;

  const latToY = (lat: number) =>
    ((mapBounds.north - lat) / (mapBounds.north - mapBounds.south)) * canvasHeight;
  const lonToX = (lon: number) =>
    ((lon - mapBounds.west) / (mapBounds.east - mapBounds.west)) * canvasWidth;

  const interval = variable === 'temperature' ? 5 : variable === 'humidity' ? 3 : 4;
  const startVal = Math.ceil(scale.min / interval) * interval;

  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1.5;
  ctx.font = 'bold 11px JetBrains Mono, monospace';
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 2;

  for (let contourVal = startVal; contourVal <= scale.max; contourVal += interval) {
    const paths: { x: number; y: number }[][] = [];
    const latCount = values.length;
    const lonCount = values[0].length;

    for (let i = 0; i < latCount - 1; i++) {
      for (let j = 0; j < lonCount - 1; j++) {
        const v00 = values[i][j];
        const v10 = values[i][j + 1];
        const v01 = values[i + 1][j];
        const v11 = values[i + 1][j + 1];

        const edges: { x: number; y: number }[] = [];

        const interp = (v1: number, v2: number, lat1: number, lon1: number, lat2: number, lon2: number) => {
          if ((v1 - contourVal) * (v2 - contourVal) < 0) {
            const t = (contourVal - v1) / (v2 - v1);
            return {
              x: lonToX(lon1 + t * (lon2 - lon1)),
              y: latToY(lat1 + t * (lat2 - lat1)),
            };
          }
          return null;
        };

        const lat0 = latMin + i * latStep;
        const lat1 = lat0 + latStep;
        const lon0 = lonMin + j * lonStep;
        const lon1 = lon0 + lonStep;

        const e1 = interp(v00, v10, lat0, lon0, lat0, lon1);
        const e2 = interp(v10, v11, lat0, lon1, lat1, lon1);
        const e3 = interp(v01, v11, lat1, lon0, lat1, lon1);
        const e4 = interp(v00, v01, lat0, lon0, lat1, lon0);

        if (e1) edges.push(e1);
        if (e2) edges.push(e2);
        if (e3) edges.push(e3);
        if (e4) edges.push(e4);

        if (edges.length >= 2) {
          paths.push(edges);
        }
      }
    }

    ctx.beginPath();
    for (const seg of paths) {
      ctx.moveTo(seg[0].x, seg[0].y);
      for (let k = 1; k < seg.length; k++) {
        ctx.lineTo(seg[k].x, seg[k].y);
      }
    }
    ctx.stroke();

    if (paths.length > 0) {
      const midSeg = paths[Math.floor(paths.length / 2)];
      if (midSeg.length >= 2) {
        const labelPt = midSeg[0];
        ctx.fillText(`${contourVal}`, labelPt.x + 4, labelPt.y - 4);
      }
    }
  }
  ctx.shadowBlur = 0;
}

export function drawStreamlines(
  ctx: CanvasRenderingContext2D,
  windData: WindGridData,
  mapBounds: { north: number; south: number; east: number; west: number },
  canvasWidth: number,
  canvasHeight: number
) {
  const { latMin, latStep, lonMin, lonStep, u, v } = windData;
  const latCount = u.length;
  const lonCount = u[0].length;

  const latToY = (lat: number) =>
    ((mapBounds.north - lat) / (mapBounds.north - mapBounds.south)) * canvasHeight;
  const lonToX = (lon: number) =>
    ((lon - mapBounds.west) / (mapBounds.east - mapBounds.west)) * canvasWidth;
  const xToLon = (x: number) => mapBounds.west + (x / canvasWidth) * (mapBounds.east - mapBounds.west);
  const yToLat = (y: number) => mapBounds.north - (y / canvasHeight) * (mapBounds.north - mapBounds.south);

  function interpolateUV(lat: number, lon: number): { uVal: number; vVal: number } {
    const iF = (lat - latMin) / latStep;
    const jF = (lon - lonMin) / lonStep;
    const i0 = Math.max(0, Math.min(latCount - 2, Math.floor(iF)));
    const j0 = Math.max(0, Math.min(lonCount - 2, Math.floor(jF)));
    const di = iF - i0;
    const dj = jF - j0;

    const uVal =
      u[i0][j0] * (1 - di) * (1 - dj) +
      u[i0 + 1][j0] * di * (1 - dj) +
      u[i0][j0 + 1] * (1 - di) * dj +
      u[i0 + 1][j0 + 1] * di * dj;
    const vVal =
      v[i0][j0] * (1 - di) * (1 - dj) +
      v[i0 + 1][j0] * di * (1 - dj) +
      v[i0][j0 + 1] * (1 - di) * dj +
      v[i0 + 1][j0 + 1] * di * dj;

    return { uVal, vVal };
  }

  const speeds: number[] = [];
  for (let i = 0; i < latCount; i++) {
    for (let j = 0; j < lonCount; j++) {
      speeds.push(Math.sqrt(u[i][j] * u[i][j] + v[i][j] * v[i][j]));
    }
  }
  const maxSpeed = Math.max(1, ...speeds);

  const stepPx = 20;
  const maxSteps = 250;
  const dt = 0.4;

  const seeds: { x: number; y: number }[] = [];
  for (let sy = 15; sy < canvasHeight - 15; sy += stepPx) {
    for (let sx = 15; sx < canvasWidth - 15; sx += stepPx) {
      seeds.push({ x: sx, y: sy });
    }
  }

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (const seed of seeds) {
    let x = seed.x;
    let y = seed.y;
    const points: { x: number; y: number; speed: number }[] = [];

    for (let s = 0; s < maxSteps; s++) {
      const lon = xToLon(x);
      const lat = yToLat(y);

      if (lat < latMin || lat > latMin + latCount * latStep || lon < lonMin || lon > lonMin + lonCount * lonStep) break;
      if (x < 0 || x > canvasWidth || y < 0 || y > canvasHeight) break;

      const { uVal, vVal } = interpolateUV(lat, lon);
      const speed = Math.sqrt(uVal * uVal + vVal * vVal);

      points.push({ x, y, speed });

      const dLon = uVal * dt / (111000 * Math.cos((lat * Math.PI) / 180));
      const dLat = -vVal * dt / 111000;

      x += (dLon / (mapBounds.east - mapBounds.west)) * canvasWidth;
      y += (dLat / (mapBounds.north - mapBounds.south)) * canvasHeight;
    }

    if (points.length < 5) continue;

    const avgSpeed = points.reduce((s, p) => s + p.speed, 0) / points.length;
    const t = Math.min(1, avgSpeed / (maxSpeed * 0.5));

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }

    const r = Math.round(0 + t * 200);
    const g = Math.round(180 - t * 80);
    const b = Math.round(255 - t * 200);
    ctx.strokeStyle = `rgba(${r},${g},${b},${0.65 + t * 0.25})`;
    ctx.lineWidth = 0.8 + t * 2.5;
    ctx.stroke();

    if (points.length > 12) {
      const arrowIdx = Math.floor(points.length * 0.45);
      const p1 = points[arrowIdx];
      const p2 = points[Math.min(arrowIdx + 3, points.length - 1)];
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const arrowSize = 5 + t * 3;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(
        p1.x - arrowSize * Math.cos(angle - Math.PI / 6),
        p1.y - arrowSize * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(
        p1.x - arrowSize * Math.cos(angle + Math.PI / 6),
        p1.y - arrowSize * Math.sin(angle + Math.PI / 6)
      );
      ctx.strokeStyle = `rgba(${r},${g},${b},0.9)`;
      ctx.lineWidth = 1.2 + t * 1;
      ctx.stroke();
    }
  }
}
