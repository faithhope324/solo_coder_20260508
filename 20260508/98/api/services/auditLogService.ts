import { dataStore } from '../store/dataStore';
import type { AuditLog } from '../types';

export const auditLogService = {
  getLogs(page: number = 1, pageSize: number = 10, tenantId?: string): { logs: AuditLog[]; total: number } {
    return dataStore.getAuditLogsPaged(page, pageSize, tenantId);
  },

  addLog(log: Omit<AuditLog, 'id' | 'timestamp'>): AuditLog {
    return dataStore.addAuditLog(log);
  }
};
