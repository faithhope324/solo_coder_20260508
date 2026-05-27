export interface AtomType {
  id: number;
  name: string;
  color: string;
  radius: number;
  mass: number;
}

export interface SimulationConfig {
  systemName: string;
  atomCount: number;
  boxSize: [number, number, number];
  temperature: number;
  timestep: number;
  totalFrames: number;
  atomTypes: number[];
  writeInterval: number;
}

export interface MetaMessage {
  type: 'meta';
  atomCount: number;
  totalFrames: number;
  boxSize: [number, number, number];
  atomTypes: Array<{ id: number; name: string; color: string; radius: number }>;
  timestep: number;
  systemName: string;
}

export interface FrameData {
  frame: number;
  time: number;
  temperature: number;
  potentialEnergy: number;
  kineticEnergy: number;
  positions: Float32Array;
  velocities?: Float32Array;
}

export interface ControlMessage {
  type: 'play' | 'pause' | 'seek' | 'speed' | 'init';
  frame?: number;
  speed?: number;
}

export interface FrameBuffer {
  frame: number;
  data: Uint8Array;
  originalSize: number;
  compressedSize: number;
}

export const ATOM_TYPES: Record<string, AtomType> = {
  H: { id: 1, name: 'H', color: '#FFFFFF', radius: 0.31, mass: 1.008 },
  C: { id: 2, name: 'C', color: '#909090', radius: 0.77, mass: 12.011 },
  N: { id: 3, name: 'N', color: '#3050F8', radius: 0.71, mass: 14.007 },
  O: { id: 4, name: 'O', color: '#FF0D0D', radius: 0.66, mass: 15.999 },
  S: { id: 5, name: 'S', color: '#FFFF30', radius: 1.04, mass: 32.065 },
};

export const MESSAGE_TYPE = {
  META: 0x01,
  FRAME: 0x02,
  CONTROL: 0x03,
  ERROR: 0x04,
} as const;
