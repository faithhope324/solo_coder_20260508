export interface Tenant {
  id: string;
  name: string;
  cpu: {
    quota: number;
    used: number;
  };
  memory: {
    quota: number;
    used: number;
  };
  storage: {
    quota: number;
    used: number;
  };
  createdAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  operator: string;
  action: 'update_quota';
  tenantId: string;
  tenantName: string;
  changes: {
    resource: 'cpu' | 'memory' | 'storage';
    oldValue: number;
    newValue: number;
  }[];
}

export interface UpdateQuotaRequest {
  cpuQuota?: number;
  memoryQuota?: number;
  storageQuota?: number;
}

export type SortField = 'name' | 'cpuUsage' | 'memoryUsage' | 'storageUsage';
export type SortOrder = 'asc' | 'desc';
