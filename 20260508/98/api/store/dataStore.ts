import type { Tenant, AuditLog } from '../types';

const initialTenants: Tenant[] = [
  {
    id: 't001',
    name: '数据平台团队',
    cpu: { quota: 32, used: 28 },
    memory: { quota: 64, used: 52 },
    storage: { quota: 10, used: 8.5 },
    createdAt: '2025-01-15T10:00:00Z'
  },
  {
    id: 't002',
    name: 'AI算法团队',
    cpu: { quota: 64, used: 72 },
    memory: { quota: 128, used: 140 },
    storage: { quota: 50, used: 32 },
    createdAt: '2025-02-20T14:30:00Z'
  },
  {
    id: 't003',
    name: '电商前端团队',
    cpu: { quota: 16, used: 8 },
    memory: { quota: 32, used: 18 },
    storage: { quota: 5, used: 2.3 },
    createdAt: '2025-03-01T09:15:00Z'
  },
  {
    id: 't004',
    name: '金融后端团队',
    cpu: { quota: 48, used: 45 },
    memory: { quota: 96, used: 88 },
    storage: { quota: 20, used: 19.8 },
    createdAt: '2025-03-10T11:45:00Z'
  },
  {
    id: 't005',
    name: '游戏开发团队',
    cpu: { quota: 32, used: 22 },
    memory: { quota: 64, used: 45 },
    storage: { quota: 30, used: 28.5 },
    createdAt: '2025-04-05T16:20:00Z'
  },
  {
    id: 't006',
    name: '移动应用团队',
    cpu: { quota: 24, used: 10 },
    memory: { quota: 48, used: 25 },
    storage: { quota: 8, used: 3.2 },
    createdAt: '2025-04-18T08:30:00Z'
  }
];

const initialAuditLogs: AuditLog[] = [
  {
    id: 'a001',
    timestamp: '2026-05-20T10:30:00Z',
    operator: 'admin',
    action: 'update_quota',
    tenantId: 't002',
    tenantName: 'AI算法团队',
    changes: [
      { resource: 'cpu', oldValue: 48, newValue: 64 },
      { resource: 'memory', oldValue: 96, newValue: 128 }
    ]
  },
  {
    id: 'a002',
    timestamp: '2026-05-22T14:15:00Z',
    operator: 'admin',
    action: 'update_quota',
    tenantId: 't004',
    tenantName: '金融后端团队',
    changes: [
      { resource: 'storage', oldValue: 15, newValue: 20 }
    ]
  },
  {
    id: 'a003',
    timestamp: '2026-05-25T09:45:00Z',
    operator: 'admin',
    action: 'update_quota',
    tenantId: 't001',
    tenantName: '数据平台团队',
    changes: [
      { resource: 'memory', oldValue: 48, newValue: 64 }
    ]
  }
];

class DataStore {
  private tenants: Tenant[];
  private auditLogs: AuditLog[];

  constructor() {
    this.tenants = [...initialTenants];
    this.auditLogs = [...initialAuditLogs];
  }

  getTenants(): Tenant[] {
    return [...this.tenants];
  }

  getTenantById(id: string): Tenant | undefined {
    return this.tenants.find(t => t.id === id);
  }

  updateTenantQuota(id: string, updates: { cpuQuota?: number; memoryQuota?: number; storageQuota?: number }): Tenant | undefined {
    const tenant = this.tenants.find(t => t.id === id);
    if (!tenant) return undefined;

    if (updates.cpuQuota !== undefined) tenant.cpu.quota = updates.cpuQuota;
    if (updates.memoryQuota !== undefined) tenant.memory.quota = updates.memoryQuota;
    if (updates.storageQuota !== undefined) tenant.storage.quota = updates.storageQuota;

    return { ...tenant };
  }

  addAuditLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    const newLog: AuditLog = {
      ...log,
      id: `a${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    this.auditLogs.unshift(newLog);
    return newLog;
  }

  getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  getAuditLogsPaged(page: number, pageSize: number, tenantId?: string): { logs: AuditLog[]; total: number } {
    let logs = [...this.auditLogs];
    if (tenantId) {
      logs = logs.filter(l => l.tenantId === tenantId);
    }
    const total = logs.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return { logs: logs.slice(start, end), total };
  }
}

export const dataStore = new DataStore();
