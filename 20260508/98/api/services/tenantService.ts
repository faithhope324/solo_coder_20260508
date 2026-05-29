import { dataStore } from '../store/dataStore';
import type { Tenant, SortField, SortOrder, UpdateQuotaRequest } from '../types';

function getUsageRate(used: number, quota: number): number {
  return quota > 0 ? used / quota : 0;
}

function compareByField(a: Tenant, b: Tenant, field: SortField, order: SortOrder): number {
  let comparison = 0;
  switch (field) {
    case 'name':
      comparison = a.name.localeCompare(b.name, 'zh-CN');
      break;
    case 'cpuUsage':
      comparison = getUsageRate(a.cpu.used, a.cpu.quota) - getUsageRate(b.cpu.used, b.cpu.quota);
      break;
    case 'memoryUsage':
      comparison = getUsageRate(a.memory.used, a.memory.quota) - getUsageRate(b.memory.used, b.memory.quota);
      break;
    case 'storageUsage':
      comparison = getUsageRate(a.storage.used, a.storage.quota) - getUsageRate(b.storage.used, b.storage.quota);
      break;
  }
  return order === 'asc' ? comparison : -comparison;
}

export const tenantService = {
  getTenants(
    search?: string,
    sortBy: SortField = 'name',
    sortOrder: SortOrder = 'asc'
  ): Tenant[] {
    let tenants = dataStore.getTenants();

    if (search) {
      const searchLower = search.toLowerCase();
      tenants = tenants.filter(t =>
        t.name.toLowerCase().includes(searchLower)
      );
    }

    tenants.sort((a, b) => compareByField(a, b, sortBy, sortOrder));

    return tenants;
  },

  getTenantById(id: string): Tenant | undefined {
    return dataStore.getTenantById(id);
  },

  updateQuota(id: string, request: UpdateQuotaRequest): { tenant: Tenant; changes: { resource: 'cpu' | 'memory' | 'storage'; oldValue: number; newValue: number }[] } | null {
    const tenant = dataStore.getTenantById(id);
    if (!tenant) return null;

    const changes: { resource: 'cpu' | 'memory' | 'storage'; oldValue: number; newValue: number }[] = [];
    const updates: { cpuQuota?: number; memoryQuota?: number; storageQuota?: number } = {};

    if (request.cpuQuota !== undefined && request.cpuQuota !== tenant.cpu.quota) {
      changes.push({ resource: 'cpu', oldValue: tenant.cpu.quota, newValue: request.cpuQuota });
      updates.cpuQuota = request.cpuQuota;
    }
    if (request.memoryQuota !== undefined && request.memoryQuota !== tenant.memory.quota) {
      changes.push({ resource: 'memory', oldValue: tenant.memory.quota, newValue: request.memoryQuota });
      updates.memoryQuota = request.memoryQuota;
    }
    if (request.storageQuota !== undefined && request.storageQuota !== tenant.storage.quota) {
      changes.push({ resource: 'storage', oldValue: tenant.storage.quota, newValue: request.storageQuota });
      updates.storageQuota = request.storageQuota;
    }

    if (changes.length === 0) {
      return { tenant: { ...tenant }, changes: [] };
    }

    const updatedTenant = dataStore.updateTenantQuota(id, updates);
    return updatedTenant ? { tenant: updatedTenant, changes } : null;
  }
};
