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

export interface Event {
  id: string;
  type: 'pod_created' | 'pod_deleted' | 'pod_failed' | 'deployment_scaled' | 'container_started' | 'container_stopped';
  message: string;
  timestamp: string;
  source: string;
  metadata: Record<string, string>;
}

export interface MetricsHistory {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
}
