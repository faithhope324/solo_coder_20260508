import type { Request, Response } from 'express';
import { auditLogService } from '../services/auditLogService';

export const auditLogController = {
  async getLogs(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const tenantId = req.query.tenantId as string;

      const result = auditLogService.getLogs(page, pageSize, tenantId);

      res.json({ logs: result.logs, total: result.total });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch audit logs' });
    }
  }
};
