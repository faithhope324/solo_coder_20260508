import React, { useRef, useEffect, useCallback } from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { worldToScreen } from '../../utils/geometry';
import {
  colormapBlueWhiteRed,
  interpolateToGrid,
  marchingSquares,
  generateContourLevels,
  drawArrow,
  drawColorBar,
  getPotentialStats,
} from '../../utils/visualization';
import { Point, FEMResult } from '../../types';

const ResultCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    result,
    viewTransform,
    visualization,
    solverConfig,
  } = useSimulationStore();
  
  const drawMesh = useCallback((
    ctx: CanvasRenderingContext2D,
    result: FEMResult,
    width: number,
    height: number,
    scale: number,
    offsetX: number,
    offsetY: number
  ) => {
    const { nodes, elements } = result;
    
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 0.5;
    
    elements.forEach(elem => {
      const p1 = worldToScreen(nodes[elem[0]], width, height, scale, offsetX, offsetY);
      const p2 = worldToScreen(nodes[elem[1]], width, height, scale, offsetX, offsetY);
      const p3 = worldToScreen(nodes[elem[2]], width, height, scale, offsetX, offsetY);
      
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.stroke();
    });
  }, []);
  
  const drawContours = useCallback((
    ctx: CanvasRenderingContext2D,
    result: FEMResult,
    width: number,
    height: number,
    scale: number,
    offsetX: number,
    offsetY: number,
    contourLevels: number
  ) => {
    const { minV, maxV } = getPotentialStats(result);
    
    const gridSize = 100;
    const gridData = interpolateToGrid(result, gridSize);
    
    const levels = generateContourLevels(minV, maxV, contourLevels);
    
    const domain = solverConfig.domainSize;
    const cellWidth = (domain.width * scale) / (gridSize - 1);
    const cellHeight = (domain.height * scale) / (gridSize - 1);
    
    const offsetX2 = offsetX;
    const offsetY2 = height - (domain.height * scale + offsetY);
    
    levels.forEach((level, levelIdx) => {
      const segments = marchingSquares(gridData.data, level, 1);
      
      const t = levelIdx / (levels.length - 1);
      const hue = t < 0.5 ? 240 : 0;
      const lightness = t < 0.5 ? 50 + t * 100 : 50 - (t - 0.5) * 100;
      
      ctx.strokeStyle = colormapBlueWhiteRed(level, minV, maxV);
      ctx.lineWidth = 1.5;
      
      segments.forEach(segment => {
        const startScreen = {
          x: segment.start.x * cellWidth + offsetX2,
          y: segment.start.y * cellHeight + offsetY2,
        };
        const endScreen = {
          x: segment.end.x * cellWidth + offsetX2,
          y: segment.end.y * cellHeight + offsetY2,
        };
        
        if (segment.start.x !== segment.end.x || segment.start.y !== segment.end.y) {
          ctx.beginPath();
          ctx.moveTo(startScreen.x, startScreen.y);
          ctx.lineTo(endScreen.x, endScreen.y);
          ctx.stroke();
        }
      });
    });
    
    drawColorBar(ctx, width - 80, 20, 20, height - 60, minV, maxV);
  }, [solverConfig.domainSize]);
  
  const drawVectors = useCallback((
    ctx: CanvasRenderingContext2D,
    result: FEMResult,
    width: number,
    height: number,
    scale: number,
    offsetX: number,
    offsetY: number,
    vectorScale: number
  ) => {
    const { nodes, electricField } = result;
    
    const step = Math.max(1, Math.floor(nodes.length / 100));
    
    for (let i = 0; i < nodes.length; i += step) {
      const node = nodes[i];
      const eField = electricField[i];
      
      const magnitude = Math.sqrt(eField.x * eField.x + eField.y * eField.y);
      if (magnitude < 1e-15) continue;
      
      const normalizedX = eField.x / magnitude;
      const normalizedY = eField.y / magnitude;
      
      const arrowLength = Math.min(30, magnitude * vectorScale * scale);
      
      const start = worldToScreen(node, width, height, scale, offsetX, offsetY);
      const end: Point = {
        x: start.x + normalizedX * arrowLength,
        y: start.y - normalizedY * arrowLength,
      };
      
      const colorIntensity = Math.min(1, magnitude / 1e6);
      const r = Math.round(255 * colorIntensity);
      const g = Math.round(255 * (1 - colorIntensity));
      const b = 100;
      
      drawArrow(ctx, start, end, `rgb(${r}, ${g}, ${b})`, 1.5, 6);
    }
  }, []);
  
  const drawPotentialMap = useCallback((
    ctx: CanvasRenderingContext2D,
    result: FEMResult,
    width: number,
    height: number,
    scale: number,
    offsetX: number,
    offsetY: number
  ) => {
    const { nodes, elements, potential } = result;
    const { minV, maxV } = getPotentialStats(result);
    
    elements.forEach(elem => {
      const i = elem[0], j = elem[1], k = elem[2];
      const p1 = worldToScreen(nodes[i], width, height, scale, offsetX, offsetY);
      const p2 = worldToScreen(nodes[j], width, height, scale, offsetX, offsetY);
      const p3 = worldToScreen(nodes[k], width, height, scale, offsetX, offsetY);
      
      const avgPotential = (potential[i] + potential[j] + potential[k]) / 3;
      
      ctx.fillStyle = colormapBlueWhiteRed(avgPotential, minV, maxV);
      ctx.globalAlpha = 0.6;
      
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.closePath();
      ctx.fill();
    });
    
    ctx.globalAlpha = 1;
  }, []);
  
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !result) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { scale, offsetX, offsetY } = viewTransform;
    const { width, height } = canvas;
    
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    
    const domain = solverConfig.domainSize;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    const corners = [
      { x: 0, y: 0 },
      { x: domain.width, y: 0 },
      { x: domain.width, y: domain.height },
      { x: 0, y: domain.height },
    ].map(p => worldToScreen(p, width, height, scale, offsetX, offsetY));
    
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    corners.forEach(c => ctx.lineTo(c.x, c.y));
    ctx.closePath();
    ctx.stroke();
    
    if (visualization.showContours) {
      drawPotentialMap(ctx, result, width, height, scale, offsetX, offsetY);
      drawContours(ctx, result, width, height, scale, offsetX, offsetY, visualization.contourLevels);
    }
    
    if (visualization.showGrid) {
      drawMesh(ctx, result, width, height, scale, offsetX, offsetY);
    }
    
    if (visualization.showVectors) {
      drawVectors(ctx, result, width, height, scale, offsetX, offsetY, visualization.vectorScale);
    }
  }, [result, viewTransform, visualization, solverConfig.domainSize, drawMesh, drawContours, drawVectors, drawPotentialMap]);
  
  useEffect(() => {
    render();
  }, [render]);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    
    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const size = Math.min(rect.width, rect.height) - 32;
      canvas.width = size;
      canvas.height = size;
      render();
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [render]);
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(10, Math.min(200, viewTransform.scale * delta));
    useSimulationStore.getState().setViewTransform({ scale: newScale });
  };
  
  if (!result) {
    return (
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center bg-slate-900 p-4 overflow-hidden"
      >
        <div className="text-slate-500 text-center">
          <p className="text-lg mb-2">No simulation results yet</p>
          <p className="text-sm">Run a simulation to see results here</p>
        </div>
      </div>
    );
  }
  
  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center bg-slate-900 p-4 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="border border-slate-700 rounded-lg shadow-2xl"
        onWheel={handleWheel}
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};

export default ResultCanvas;
