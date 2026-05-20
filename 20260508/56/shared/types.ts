export interface Planet {
  id: string;
  name: string;
  mass: number;
  position: [number, number, number];
  velocity: [number, number, number];
  color: string;
  radius: number;
}

export interface SimulationConfig {
  planets: Planet[];
  integrator: 'rk4' | 'hermite';
  timeStep: number;
  gravitationalConstant: number;
  softening: number;
}

export interface TimeStepData {
  time: number;
  positions: [number, number, number][];
  velocities: [number, number, number][];
  centerOfMass: [number, number, number];
  totalEnergy: number;
  kineticEnergy: number;
  potentialEnergy: number;
}

export interface PresetScene {
  id: string;
  name: string;
  description: string;
  config: SimulationConfig;
}

export interface WorkerTask {
  type: 'calculateForces';
  positions: Float32Array;
  masses: Float32Array;
  G: number;
  softening: number;
  startIndex: number;
  endIndex: number;
}

export interface WorkerResult {
  type: 'forcesResult';
  forces: Float32Array;
  startIndex: number;
  endIndex: number;
}
