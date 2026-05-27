export interface ContainerInfo {
  id: string;
  name: string;
  image: string;
  status: 'running' | 'stopped' | 'paused' | 'error';
  state: string;
  createdAt: string;
  ports: PortInfo[];
}

export interface PortInfo {
  privatePort: number;
  publicPort?: number;
  type: string;
}

export interface ContainerStats {
  containerId: string;
  containerName: string;
  cpuUsage: number;
  memoryUsage: number;
  memoryLimit: number;
  networkRx: number;
  networkTx: number;
  timestamp: string;
}

export interface PodInfo {
  name: string;
  namespace: string;
  uid: string;
  status: 'Running' | 'Pending' | 'Succeeded' | 'Failed' | 'Unknown';
  phase: string;
  nodeName: string;
  podIP: string;
  startTime: string;
  containers: ContainerStatus[];
  labels: Record<string, string>;
}

export interface ContainerStatus {
  name: string;
  image: string;
  ready: boolean;
  restartCount: number;
  state: string;
}

export interface PodMetrics {
  podName: string;
  namespace: string;
  cpuUsage: number;
  memoryUsage: number;
  timestamp: string;
  containers: ContainerMetric[];
}

export interface ContainerMetric {
  name: string;
  cpuUsage: number;
  memoryUsage: number;
}

export interface DeploymentInfo {
  name: string;
  namespace: string;
  uid: string;
  replicas: number;
  readyReplicas: number;
  updatedReplicas: number;
  availableReplicas: number;
  unavailableReplicas: number;
  status: 'Healthy' | 'Progressing' | 'Degraded';
  creationTimestamp: string;
  labels: Record<string, string>;
}

export interface ScaleRequest {
  namespace: string;
  name: string;
  replicas: number;
}

export interface Event {
  id: string;
  type: 'pod_created' | 'pod_deleted' | 'pod_failed' | 'deployment_scaled' | 'container_started' | 'container_stopped';
  message: string;
  timestamp: string;
  source: string;
  metadata: Record<string, string>;
}

export interface ServiceHealth {
  name: string;
  namespace: string;
  status: 'healthy' | 'warning' | 'critical';
  readyReplicas: number;
  totalReplicas: number;
  cpuUsage: number;
  memoryUsage: number;
}
