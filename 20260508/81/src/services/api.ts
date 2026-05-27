import type {
  SimulationParams,
  SimulationResult,
  SensitivityRequest,
  SensitivityResult,
} from '../../shared/types';

const API_BASE = '/api';

export async function runSimulation(params: SimulationParams): Promise<SimulationResult> {
  const response = await fetch(`${API_BASE}/simulation`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '模拟请求失败');
  }

  return response.json();
}

export async function runSensitivityAnalysis(
  request: SensitivityRequest
): Promise<SensitivityResult> {
  const response = await fetch(`${API_BASE}/sensitivity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '敏感性分析请求失败');
  }

  return response.json();
}

export async function getDefaultParams(): Promise<SimulationParams> {
  const response = await fetch(`${API_BASE}/default-params`, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('获取默认参数失败');
  }

  return response.json();
}
