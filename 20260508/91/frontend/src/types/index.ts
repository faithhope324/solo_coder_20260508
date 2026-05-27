export interface Gate {
  id: string;
  type: string;
  targets: number[];
  controls: number[];
  row: number;
  col: number;
}

export interface CircuitData {
  name: string;
  num_qubits: number;
  num_clbits?: number;
  gates: Gate[];
}

export interface CircuitInfo {
  id: string;
  name: string;
  num_qubits: number;
  gate_count: number;
}

export interface TaskResult {
  statevector: number[][];
  probabilities: Record<string, number>;
  counts: Record<string, number>;
  num_qubits: number;
}

export interface TaskStatus {
  task_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: TaskResult;
  error?: string;
  created_at: number;
  completed_at?: number;
}

export interface BlochCoordinates {
  qubit?: number;
  x: number;
  y: number;
  z: number;
}

export interface BlochWithQubit extends BlochCoordinates {
  qubit: number;
}