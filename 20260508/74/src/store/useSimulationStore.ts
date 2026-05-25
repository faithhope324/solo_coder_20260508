import { create } from 'zustand';
import {
  Shape,
  Point,
  Material,
  ToolType,
  SolverConfig,
  FEMResult,
  BoundaryCondition,
  VisualizationOptions,
  DEFAULT_MATERIALS,
} from '../types';

interface SimulationState {
  shapes: Shape[];
  selectedShapeId: string | null;
  activeTool: ToolType;
  
  drawingPoints: Point[];
  isDrawing: boolean;
  mousePosition: Point | null;
  
  solverConfig: SolverConfig;
  boundaryConditions: BoundaryCondition[];
  
  result: FEMResult | null;
  isSolving: boolean;
  solveError: string | null;
  
  visualization: VisualizationOptions;
  
  viewTransform: {
    scale: number;
    offsetX: number;
    offsetY: number;
  };

  pendingDropMaterial: Material | null;
  isDragOver: boolean;
}

interface SimulationActions {
  setActiveTool: (tool: ToolType) => void;
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  selectShape: (id: string | null) => void;
  
  startDrawing: (point: Point) => void;
  updateDrawing: (point: Point) => void;
  finishDrawing: () => void;
  cancelDrawing: () => void;
  
  setMousePosition: (point: Point | null) => void;
  
  setSolverConfig: (config: Partial<SolverConfig>) => void;
  addBoundaryCondition: (bc: BoundaryCondition) => void;
  
  setResult: (result: FEMResult | null) => void;
  setIsSolving: (isSolving: boolean) => void;
  setSolveError: (error: string | null) => void;
  
  setVisualization: (options: Partial<VisualizationOptions>) => void;
  
  setViewTransform: (transform: Partial<SimulationState['viewTransform']>) => void;
  resetView: () => void;
  
  clearAll: () => void;

  setPendingDropMaterial: (material: Material | null) => void;
  setIsDragOver: (isOver: boolean) => void;
  createShapeFromDrop: (
    type: 'rectangle' | 'circle' | 'polygon',
    position: Point,
    material: Material,
    isElectrode: boolean,
    defaultName: string
  ) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export const useSimulationStore = create<SimulationState & SimulationActions>((set, get) => ({
  shapes: [],
  selectedShapeId: null,
  activeTool: 'select',
  
  drawingPoints: [],
  isDrawing: false,
  mousePosition: null,
  
  solverConfig: {
    meshDensity: 10,
    domainSize: { width: 10, height: 10 },
  },
  boundaryConditions: [{ type: 'dirichlet', value: 0 }],
  
  result: null,
  isSolving: false,
  solveError: null,
  
  visualization: {
    showGrid: true,
    showContours: true,
    showVectors: true,
    contourLevels: 15,
    vectorScale: 0.05,
  },
  
  viewTransform: {
    scale: 50,
    offsetX: 50,
    offsetY: 50,
  },

  pendingDropMaterial: null,
  isDragOver: false,
  
  setActiveTool: (tool) => {
    const { isDrawing, cancelDrawing } = get();
    if (isDrawing) cancelDrawing();
    set({ activeTool: tool, selectedShapeId: null });
  },
  
  addShape: (shape) => set((state) => ({
    shapes: [...state.shapes, shape],
    isDrawing: false,
    drawingPoints: [],
  })),
  
  updateShape: (id, updates) => set((state) => ({
    shapes: state.shapes.map((s) =>
      s.id === id ? { ...s, ...updates } : s
    ),
  })),
  
  deleteShape: (id) => set((state) => ({
    shapes: state.shapes.filter((s) => s.id !== id),
    selectedShapeId: state.selectedShapeId === id ? null : state.selectedShapeId,
  })),
  
  selectShape: (id) => set({ selectedShapeId: id }),
  
  startDrawing: (point) => {
    const { activeTool } = get();
    
    if (activeTool === 'rectangle' || activeTool === 'circle') {
      set({
        drawingPoints: [point, point],
        isDrawing: true,
      });
    } else if (activeTool === 'polygon') {
      set((state) => ({
        drawingPoints: [...state.drawingPoints, point],
        isDrawing: true,
      }));
    }
  },
  
  updateDrawing: (point) => {
    const { activeTool, drawingPoints } = get();
    
    if (activeTool === 'rectangle' || activeTool === 'circle') {
      if (drawingPoints.length >= 1) {
        set({
          drawingPoints: [drawingPoints[0], point],
        });
      }
    } else if (activeTool === 'polygon') {
      if (drawingPoints.length > 0) {
        const newPoints = [...drawingPoints.slice(0, -1)];
        newPoints.push(point);
        set({ drawingPoints: newPoints });
      }
    }
  },
  
  finishDrawing: () => {
    const { activeTool, drawingPoints, solverConfig, addShape } = get();
    
    if (drawingPoints.length < 2) return;
    
    const defaultMaterial: Material = DEFAULT_MATERIALS.air;
    
    if (activeTool === 'rectangle' && drawingPoints.length >= 2) {
      const newShape: Shape = {
        id: generateId(),
        type: 'rectangle',
        name: `Rectangle ${get().shapes.length + 1}`,
        points: drawingPoints.slice(0, 2),
        material: defaultMaterial,
        isElectrode: false,
      };
      addShape(newShape);
    } else if (activeTool === 'circle' && drawingPoints.length >= 2) {
      const dx = drawingPoints[1].x - drawingPoints[0].x;
      const dy = drawingPoints[1].y - drawingPoints[0].y;
      const radius = Math.sqrt(dx * dx + dy * dy);
      
      const newShape: Shape = {
        id: generateId(),
        type: 'circle',
        name: `Circle ${get().shapes.length + 1}`,
        points: [drawingPoints[0]],
        radius,
        material: defaultMaterial,
        isElectrode: false,
      };
      addShape(newShape);
    } else if (activeTool === 'polygon' && drawingPoints.length >= 3) {
      const newShape: Shape = {
        id: generateId(),
        type: 'polygon',
        name: `Polygon ${get().shapes.length + 1}`,
        points: drawingPoints.slice(0, -1),
        material: defaultMaterial,
        isElectrode: false,
      };
      addShape(newShape);
    }
    
    set({ isDrawing: false, drawingPoints: [] });
  },
  
  cancelDrawing: () => set({
    isDrawing: false,
    drawingPoints: [],
  }),
  
  setMousePosition: (point) => set({ mousePosition: point }),
  
  setSolverConfig: (config) => set((state) => ({
    solverConfig: { ...state.solverConfig, ...config },
  })),
  
  addBoundaryCondition: (bc) => set((state) => ({
    boundaryConditions: [...state.boundaryConditions, bc],
  })),
  
  setResult: (result) => set({ result }),
  setIsSolving: (isSolving) => set({ isSolving }),
  setSolveError: (error) => set({ solveError: error }),
  
  setVisualization: (options) => set((state) => ({
    visualization: { ...state.visualization, ...options },
  })),
  
  setViewTransform: (transform) => set((state) => ({
    viewTransform: { ...state.viewTransform, ...transform },
  })),
  
  resetView: () => set({
    viewTransform: {
      scale: 50,
      offsetX: 50,
      offsetY: 50,
    },
  }),
  
  clearAll: () => set({
    shapes: [],
    selectedShapeId: null,
    result: null,
    drawingPoints: [],
    isDrawing: false,
    solveError: null,
  }),

  setPendingDropMaterial: (material) => set({ pendingDropMaterial: material }),

  setIsDragOver: (isOver) => set({ isDragOver: isOver }),

  createShapeFromDrop: (type, position, material, isElectrode, defaultName) => {
    const { shapes } = get();
    const defaultSize = 1.0;

    let newShape: Shape;

    if (type === 'rectangle') {
      newShape = {
        id: generateId(),
        type: 'rectangle',
        name: `${defaultName} ${shapes.length + 1}`,
        points: [
          { x: position.x - defaultSize / 2, y: position.y - defaultSize / 2 },
          { x: position.x + defaultSize / 2, y: position.y + defaultSize / 2 },
        ],
        material,
        isElectrode,
        boundaryCondition: isElectrode ? { type: 'dirichlet', value: 0 } : undefined,
      };
    } else if (type === 'circle') {
      newShape = {
        id: generateId(),
        type: 'circle',
        name: `${defaultName} ${shapes.length + 1}`,
        points: [position],
        radius: defaultSize / 2,
        material,
        isElectrode,
        boundaryCondition: isElectrode ? { type: 'dirichlet', value: 0 } : undefined,
      };
    } else {
      const size = defaultSize / 2;
      const points: Point[] = [];
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        points.push({
          x: position.x + size * Math.cos(angle),
          y: position.y + size * Math.sin(angle),
        });
      }
      newShape = {
        id: generateId(),
        type: 'polygon',
        name: `${defaultName} ${shapes.length + 1}`,
        points,
        material,
        isElectrode,
        boundaryCondition: isElectrode ? { type: 'dirichlet', value: 0 } : undefined,
      };
    }

    set((state) => ({
      shapes: [...state.shapes, newShape],
      selectedShapeId: newShape.id,
      pendingDropMaterial: null,
      isDragOver: false,
    }));
  },
}));
