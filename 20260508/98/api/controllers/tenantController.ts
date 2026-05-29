import type { Request, Response } from 'express';
import { tenantService } from '../services/tenantService';
import { auditLogService } from '../services/auditLogService';
import type { SortField, SortOrder, UpdateQuotaRequest } from '../types';

export const tenantController = {
  async getTenants(req: Request, res: Response) {
    try {
      const { search, sortBy, sortOrder } = req.query;

      const tenants = tenantService.getTenants(
        search as string,
        (sortBy as SortField) || 'name',
        (sortOrder as SortOrder) || 'asc'
      );

      res.json({ tenants });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tenants' });
    }
  },

  async getTenantById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const tenant = tenantService.getTenantById(id);

      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      res.json({ tenant });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tenant' });
    }
  },

  async updateQuota(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const body = req.body as UpdateQuotaRequest;

      if (body.cpuQuota !== undefined && body.cpuQuota <= 0) {
        return res.status(400).json({ error: 'CPU quota must be positive' });
      }
      if (body.memoryQuota !== undefined && body.memoryQuota <= 0) {
        return res.status(400).json({ error: 'Memory quota must be positive' });
      }
      if (body.storageQuota !== undefined && body.storageQuota <= 0) {
        return res.status(400).json({ error: 'Storage quota must be positive' });
      }

      const result = tenantService.updateQuota(id, body);

      if (!result) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      if (result.changes.length > 0) {
        auditLogService.addLog({
          operator: 'admin',
          action: 'update_quota',
          tenantId: result.tenant.id,
          tenantName: result.tenant.name,
          changes: result.changes
        });
      }

      res.json({ tenant: result.tenant });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update quota' });
    }
  }
};
