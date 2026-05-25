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
