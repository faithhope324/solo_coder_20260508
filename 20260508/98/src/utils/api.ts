import type { Tenant, AuditLog, UpdateQuotaRequest, GetTenantsQuery, GetAuditLogsQuery } from '../shared/types';

const API_BASE = '/api';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

export const api = {
  async getTenants(query: GetTenantsQuery = {}): Promise<{ tenants: Tenant[] }> {
    const params = new URLSearchParams();
    if (query.search) params.append('search', query.search);
    if (query.sortBy) params.append('sortBy', query.sortBy);
    if (query.sortOrder) params.append('sortOrder', query.sortOrder);
    
    const url = `${API_BASE}/tenants${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    return handleResponse<{ tenants: Tenant[] }>(response);
  },

  async getTenantById(id: string): Promise<{ tenant: Tenant }> {
    const response = await fetch(`${API_BASE}/tenants/${id}`);
    return handleResponse<{ tenant: Tenant }>(response);
  },

  async updateQuota(id: string, request: UpdateQuotaRequest): Promise<{ tenant: Tenant }> {
    const response = await fetch(`${API_BASE}/tenants/${id}/quota`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    return handleResponse<{ tenant: Tenant }>(response);
  },

  async getAuditLogs(query: GetAuditLogsQuery = {}): Promise<{ logs: AuditLog[]; total: number }> {
    const params = new URLSearchParams();
    if (query.page) params.append('page', query.page.toString());
    if (query.pageSize) params.append('pageSize', query.pageSize.toString());
    if (query.tenantId) params.append('tenantId', query.tenantId);
    
    const url = `${API_BASE}/audit-logs${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetch(url);
    return handleResponse<{ logs: AuditLog[]; total: number }>(response);
  }
};
