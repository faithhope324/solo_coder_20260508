import type { CircuitData, CircuitInfo, TaskStatus } from '../types';

const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function runCircuit(circuit: CircuitData, shots: number = 1024): Promise<{ task_id: string; status: string }> {
  return request('/circuits/run', {
    method: 'POST',
    body: JSON.stringify({ circuit, shots }),
  });
}

export async function getTaskStatus(taskId: string): Promise<TaskStatus> {
  return request(`/tasks/${taskId}`);
}

export async function saveCircuit(circuit: CircuitData, circuitId?: string): Promise<{ circuit_id: string; status: string }> {
  return request('/circuits/save', {
    method: 'POST',
    body: JSON.stringify({ circuit, circuit_id: circuitId }),
  });
}

export async function loadCircuit(circuitId: string): Promise<CircuitData> {
  return request(`/circuits/${circuitId}`);
}

export async function listCircuits(): Promise<{ circuits: CircuitInfo[] }> {
  return request('/circuits');
}

export async function deleteCircuit(circuitId: string): Promise<{ status: string }> {
  return request(`/circuits/${circuitId}`, {
    method: 'DELETE',
  });
}

export async function getBlochCoordinates(statevector: number[][]): Promise<{ bloch: { x: number; y: number; z: number } | null }> {
  return request('/bloch', {
    method: 'POST',
    body: JSON.stringify({ statevector }),
  });
}

export async function getAllBlochCoordinates(statevector: number[][], numQubits: number): Promise<{ bloch_list: Array<{ qubit: number; x: number; y: number; z: number }> }> {
  return request('/bloch/all', {
    method: 'POST',
    body: JSON.stringify({ statevector, num_qubits: numQubits }),
  });
}