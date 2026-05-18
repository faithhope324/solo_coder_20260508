export type NodeStatus = 'healthy' | 'warning' | 'critical';

export interface CDNNode {
  id: string;
  name: string;
  location: string;
  region: string;
  lat: number;
  lng: number;
  latency: number;
  bandwidth: number;
  packetLoss: number;
  availability: number;
  throughput: number;
  cpuUsage: number;
  memoryUsage: number;
  connections: number;
  qps: number;
  status: NodeStatus;
  lastUpdated: Date;
  history: {
    latency: number[];
    bandwidth: number[];
    packetLoss: number[];
  };
}

export interface NodeStore {
  nodes: CDNNode[];
  selectedNode: CDNNode | null;
  setSelectedNode: (node: CDNNode | null) => void;
  refreshData: () => void;
  autoRefresh: boolean;
  setAutoRefresh: (enabled: boolean) => void;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
  isRefreshing: boolean;
  lastRefreshed: Date | null;
}

export const STATUS_COLORS: Record<NodeStatus, string> = {
  healthy: '#10b981',
  warning: '#f59e0b',
  critical: '#ef4444',
};

export const STATUS_LABELS: Record<NodeStatus, string> = {
  healthy: '正常',
  warning: '警告',
  critical: '异常',
};
