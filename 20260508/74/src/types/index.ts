export type ShapeType = 'rectangle' | 'circle' | 'polygon';

export interface Point {
  x: number;
  y: number;
}

export interface Material {
  name: string;
  permittivity: number;
  conductivity: number;
}

export interface BoundaryCondition {
  type: 'dirichlet' | 'neumann';
  value: number;
}

export interface Shape {
  id: string;
  type: ShapeType;
  name: string;
  points: Point[];
  radius?: number;
  material: Material;
  isElectrode: boolean;
  boundaryCondition?: BoundaryCondition;
}

export interface SolverConfig {
  meshDensity: number;
  domainSize: { width: number; height: number };
}

export interface SolveRequest {
  shapes: Shape[];
  boundaryConditions: BoundaryCondition[];
  config: SolverConfig;
}

export interface FEMResult {
  nodes: Point[];
  elements: number[][];
  potential: number[];
  electricField: { x: number; y: number }[];
  meshStats: {
    nodeCount: number;
    elementCount: number;
  };
  solveTime: number;
}

export interface ReportRequest {
  simulation: SolveRequest;
  result: FEMResult;
  title: string;
  author?: string;
}

export type ToolType = 'select' | 'rectangle' | 'circle' | 'polygon' | 'delete';

export interface VisualizationOptions {
  showGrid: boolean;
  showContours: boolean;
  showVectors: boolean;
  contourLevels: number;
  vectorScale: number;
}

export const DEFAULT_MATERIALS: Record<string, Material> = {
  air: { name: '空气', permittivity: 1.0, conductivity: 0.0 },
  copper: { name: '铜', permittivity: 1.0, conductivity: 5.96e7 },
  aluminum: { name: '铝', permittivity: 1.0, conductivity: 3.77e7 },
  silicon: { name: '硅', permittivity: 11.7, conductivity: 1e-3 },
  glass: { name: '玻璃', permittivity: 5.0, conductivity: 1e-14 },
  teflon: { name: '特氟龙', permittivity: 2.1, conductivity: 1e-16 },
  water: { name: '水', permittivity: 80.1, conductivity: 5e-3 },
};
