import { DeploymentInfo, PodInfo, PodMetrics, Event } from '../types';

const API_BASE = '/api';

export const api = {
  async getDeployments(namespace: string = 'default'): Promise<DeploymentInfo[]> {
    const response = await fetch(`${API_BASE}/k8s/deployments?namespace=${namespace}`);
    return response.json();
  },

  async getPods(namespace: string = 'default'): Promise<PodInfo[]> {
    const response = await fetch(`${API_BASE}/k8s/pods?namespace=${namespace}`);
    return response.json();
  },

  async getPodMetrics(namespace: string = 'default'): Promise<PodMetrics[]> {
    const response = await fetch(`${API_BASE}/k8s/pods/metrics?namespace=${namespace}`);
    return response.json();
  },

  async scaleDeployment(namespace: string, name: string, replicas: number): Promise<DeploymentInfo> {
    const response = await fetch(`${API_BASE}/k8s/deployments/scale`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ namespace, name, replicas }),
    });
    return response.json();
  },

  async getEvents(): Promise<Event[]> {
    const response = await fetch(`${API_BASE}/events`);
    return response.json();
  },

  async getHealth(): Promise<{ status: string; kubernetes: boolean; docker: boolean }> {
    const response = await fetch(`${API_BASE}/health`);
    return response.json();
  },
};

export function createEventWebSocket(): WebSocket {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/ws/events`;
  return new WebSocket(wsUrl);
}
