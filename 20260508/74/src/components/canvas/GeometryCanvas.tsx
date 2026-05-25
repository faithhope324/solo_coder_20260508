import React, { useRef, useEffect, useCallback } from 'react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { worldToScreen, screenToWorld, getShapePolygon, findShapeAtPoint } from '../../utils/geometry';
import { Point, Shape, DEFAULT_MATERIALS } from '../../types';

const GeometryCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    shapes,
    selectedShapeId,
    activeTool,
    drawingPoints,
    isDrawing,
    viewTransform,
    solverConfig,
    isDragOver,
    pendingDropMaterial,
    setActiveTool,
    startDrawing,
    updateDrawing,
    finishDrawing,
    selectShape,
    setViewTransform,
    setMousePosition,
    deleteShape,
    setIsDragOver,
    createShapeFromDrop,
    setPendingDropMaterial,
  } = useSimulationStore();
  
  const drawBackground = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scale: number,
    offsetX: number,
    offsetY: number
  ) => {
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);
    
    const domain = solverConfig.domainSize;
    
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x <= domain.width; x += 1) {
      const screenPoint = worldToScreen({ x, y: 0 }, width, height, scale, offsetX, offsetY);
      const endPoint = worldToScreen({ x, y: domain.height }, width, height, scale, offsetX, offsetY);
      ctx.beginPath();
      ctx.moveTo(screenPoint.x, screenPoint.y);
      ctx.lineTo(endPoint.x, endPoint.y);
      ctx.stroke();
    }
    
    for (let y = 0; y <= domain.height; y += 1) {
      const screenPoint = worldToScreen({ x: 0, y }, width, height, scale, offsetX, offsetY);
      const endPoint = worldToScreen({ x: domain.width, y }, width, height, scale, offsetX, offsetY);
      ctx.beginPath();
      ctx.moveTo(screenPoint.x, screenPoint.y);
      ctx.lineTo(endPoint.x, endPoint.y);
      ctx.stroke();
    }
    
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

    if (isDragOver) {
      ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 5]);
      ctx.strokeRect(4, 4, width - 8, height - 8);
      ctx.setLineDash([]);
      
      ctx.fillStyle = '#3b82f6';
      ctx.font = 'bold 16px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('释放以创建元件', width / 2, height / 2);
    }
  }, [solverConfig.domainSize, isDragOver]);
  
  const drawShape = useCallback((
    ctx: CanvasRenderingContext2D,
    shape: Shape,
    isSelected: boolean,
    width: number,
    height: number,
    scale: number,
    offsetX: number,
    offsetY: number
  ) => {
    const polygon = getShapePolygon(shape);
    const screenPoints = polygon.map(p => worldToScreen(p, width, height, scale, offsetX, offsetY));
    
    if (shape.isElectrode) {
      const bc = shape.boundaryCondition;
      if (bc && bc.type === 'dirichlet' && bc.value > 0) {
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
      } else {
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';
      }
    } else {
      const hue = Math.abs(shape.material.permittivity * 20) % 360;
      ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.2)`;
    }
    
    ctx.beginPath();
    ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
    screenPoints.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fill();
    
    if (isSelected) {
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 3;
      ctx.setLineDash([8, 4]);
    } else {
      ctx.strokeStyle = shape.isElectrode ? '#f59e0b' : '#64748b';
      ctx.lineWidth = 2;
      ctx.setLineDash([]);
    }
    
    ctx.beginPath();
    ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
    screenPoints.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);
    
    if (shape.isElectrode && shape.boundaryCondition) {
      const center = screenPoints.reduce((acc, p) => ({
        x: acc.x + p.x / screenPoints.length,
        y: acc.y + p.y / screenPoints.length,
      }), { x: 0, y: 0 });
      
      ctx.fillStyle = '#f1f5f9';
      ctx.font = 'bold 12px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${shape.boundaryCondition.value}V`, center.x, center.y);
    }
  }, []);
  
  const drawPreview = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    scale: number,
    offsetX: number,
    offsetY: number
  ) => {
    if (drawingPoints.length === 0) return;
    
    const screenPoints = drawingPoints.map(p => worldToScreen(p, width, height, scale, offsetX, offsetY));
    
    ctx.strokeStyle = '#06b6d4';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    
    if (activeTool === 'rectangle' && screenPoints.length >= 2) {
      ctx.strokeRect(
        screenPoints[0].x,
        screenPoints[0].y,
        screenPoints[1].x - screenPoints[0].x,
        screenPoints[1].y - screenPoints[0].y
      );
    } else if (activeTool === 'circle' && screenPoints.length >= 2) {
      const dx = screenPoints[1].x - screenPoints[0].x;
      const dy = screenPoints[1].y - screenPoints[0].y;
      const r = Math.sqrt(dx * dx + dy * dy);
      ctx.beginPath();
      ctx.arc(screenPoints[0].x, screenPoints[0].y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (activeTool === 'polygon' && screenPoints.length >= 1) {
      ctx.beginPath();
      ctx.moveTo(screenPoints[0].x, screenPoints[0].y);
      screenPoints.forEach(p => ctx.lineTo(p.x, p.y));
      if (screenPoints.length > 2) {
        ctx.closePath();
      }
      ctx.stroke();
      
      screenPoints.forEach(p => {
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }
    
    ctx.setLineDash([]);
  }, [activeTool, drawingPoints]);
  
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const { scale, offsetX, offsetY } = viewTransform;
    const { width, height } = canvas;
    
    ctx.clearRect(0, 0, width, height);
    
    drawBackground(ctx, width, height, scale, offsetX, offsetY);
    
    shapes.forEach(shape => {
      drawShape(ctx, shape, shape.id === selectedShapeId, width, height, scale, offsetX, offsetY);
    });
    
    drawPreview(ctx, width, height, scale, offsetX, offsetY);
  }, [viewTransform, shapes, selectedShapeId, drawBackground, drawShape, drawPreview]);
  
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
  
  const getWorldPoint = (e: React.MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    
    const { scale, offsetX, offsetY } = viewTransform;
    return screenToWorld(screenPoint, canvas.width, canvas.height, scale, offsetX, offsetY);
  };
  
  const handleMouseDown = (e: React.MouseEvent) => {
    const worldPoint = getWorldPoint(e);
    
    if (activeTool === 'select') {
      const shape = findShapeAtPoint(worldPoint, shapes);
      selectShape(shape ? shape.id : null);
    } else if (activeTool === 'delete') {
      const shape = findShapeAtPoint(worldPoint, shapes);
      if (shape) {
        deleteShape(shape.id);
      }
    } else {
      if (activeTool === 'polygon' && isDrawing) {
        updateDrawing(worldPoint);
      } else {
        startDrawing(worldPoint);
      }
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
    const worldPoint = getWorldPoint(e);
    setMousePosition(worldPoint);
    
    if (isDrawing) {
      if (activeTool === 'rectangle' || activeTool === 'circle') {
        updateDrawing(worldPoint);
      } else if (activeTool === 'polygon') {
        updateDrawing(worldPoint);
      }
    }
  };
  
  const handleMouseUp = () => {
    if ((activeTool === 'rectangle' || activeTool === 'circle') && isDrawing) {
      finishDrawing();
    }
  };
  
  const handleDoubleClick = () => {
    if (activeTool === 'polygon' && isDrawing && drawingPoints.length >= 3) {
      finishDrawing();
    }
  };
  
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(10, Math.min(200, viewTransform.scale * delta));
    setViewTransform({ scale: newScale });
  };
  
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isDrawing) {
      finishDrawing();
    } else {
      setActiveTool('select');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (rect) {
      const { clientX, clientY } = e;
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        setIsDragOver(false);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const shapeType = e.dataTransfer.getData('shapeType') as 'rectangle' | 'circle' | 'polygon';
    const materialKey = e.dataTransfer.getData('materialKey');
    const isElectrode = e.dataTransfer.getData('isElectrode') === 'true';
    const defaultName = e.dataTransfer.getData('defaultName') || '元件';

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };

    const { scale, offsetX, offsetY } = viewTransform;
    const worldPoint = screenToWorld(screenPoint, canvas.width, canvas.height, scale, offsetX, offsetY);

    const domain = solverConfig.domainSize;
    const clampedPoint = {
      x: Math.max(0.5, Math.min(domain.width - 0.5, worldPoint.x)),
      y: Math.max(0.5, Math.min(domain.height - 0.5, worldPoint.y)),
    };

    const material = pendingDropMaterial || 
      (materialKey && DEFAULT_MATERIALS[materialKey as keyof typeof DEFAULT_MATERIALS]) ||
      DEFAULT_MATERIALS.air;

    if (shapeType) {
      createShapeFromDrop(shapeType, clampedPoint, material, isElectrode, defaultName);
    } else if (materialKey) {
      createShapeFromDrop('rectangle', clampedPoint, material, isElectrode, '介质块');
    }

    setPendingDropMaterial(null);
  };
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      if (isDrawing) {
        useSimulationStore.getState().cancelDrawing();
      } else {
        setActiveTool('select');
        selectShape(null);
      }
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedShapeId) {
        deleteShape(selectedShapeId);
      }
    }
  }, [isDrawing, selectedShapeId, setActiveTool, selectShape, deleteShape]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
  
  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center bg-slate-900 p-4 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className={`border rounded-lg shadow-2xl transition-all duration-200 ${
          isDragOver 
            ? 'border-blue-500 bg-blue-950/20 cursor-copy' 
            : 'border-slate-700 cursor-crosshair'
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setMousePosition(null); setIsDragOver(false); }}
        onDoubleClick={handleDoubleClick}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ touchAction: 'none' }}
      />
    </div>
  );
};

export default GeometryCanvas;
