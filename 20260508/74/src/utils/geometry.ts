import { Point, Shape } from '../types';

export const pointInPolygon = (point: Point, polygon: Point[]): boolean => {
  const { x, y } = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
};

export const pointInCircle = (point: Point, center: Point, radius: number): boolean => {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return dx * dx + dy * dy <= radius * radius;
};

export const getShapePolygon = (shape: Shape): Point[] => {
  const { type, points, radius } = shape;
  
  if (type === 'rectangle') {
    const x1 = Math.min(points[0].x, points[1].x);
    const y1 = Math.min(points[0].y, points[1].y);
    const x2 = Math.max(points[0].x, points[1].x);
    const y2 = Math.max(points[0].y, points[1].y);
    return [
      { x: x1, y: y1 },
      { x: x2, y: y1 },
      { x: x2, y: y2 },
      { x: x1, y: y2 },
    ];
  } else if (type === 'circle') {
    const cx = points[0].x;
    const cy = points[0].y;
    const r = radius || 0;
    const segments = 32;
    const polygon: Point[] = [];
    for (let i = 0; i < segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      polygon.push({
        x: cx + r * Math.cos(theta),
        y: cy + r * Math.sin(theta),
      });
    }
    return polygon;
  } else if (type === 'polygon') {
    return [...points];
  }
  
  return [];
};

export const isPointInShape = (point: Point, shape: Shape): boolean => {
  const { type, points, radius } = shape;
  
  if (type === 'circle') {
    return pointInCircle(point, points[0], radius || 0);
  } else {
    const polygon = getShapePolygon(shape);
    return pointInPolygon(point, polygon);
  }
};

export const findShapeAtPoint = (point: Point, shapes: Shape[]): Shape | null => {
  for (let i = shapes.length - 1; i >= 0; i--) {
    if (isPointInShape(point, shapes[i])) {
      return shapes[i];
    }
  }
  return null;
};

export const distanceToLine = (point: Point, lineStart: Point, lineEnd: Point): number => {
  const { x, y } = point;
  const x1 = lineStart.x, y1 = lineStart.y;
  const x2 = lineEnd.x, y2 = lineEnd.y;
  
  const dx = x2 - x1;
  const dy = y2 - y1;
  
  if (dx === 0 && dy === 0) {
    return Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
  }
  
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));
  
  const projX = x1 + clampedT * dx;
  const projY = y1 + clampedT * dy;
  
  return Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
};

export const getShapeCenter = (shape: Shape): Point => {
  const polygon = getShapePolygon(shape);
  const cx = polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length;
  const cy = polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length;
  return { x: cx, y: cy };
};

export const worldToScreen = (
  point: Point,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number
): Point => {
  return {
    x: point.x * scale + offsetX,
    y: canvasHeight - (point.y * scale + offsetY),
  };
};

export const screenToWorld = (
  point: Point,
  canvasWidth: number,
  canvasHeight: number,
  scale: number,
  offsetX: number,
  offsetY: number
): Point => {
  return {
    x: (point.x - offsetX) / scale,
    y: (canvasHeight - point.y - offsetY) / scale,
  };
};

export const getShapeBoundingBox = (shape: Shape): { minX: number; maxX: number; minY: number; maxY: number } => {
  const polygon = getShapePolygon(shape);
  const xs = polygon.map(p => p.x);
  const ys = polygon.map(p => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};
