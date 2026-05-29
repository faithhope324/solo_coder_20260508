import React, { useEffect } from 'react';
import { AuditLogTable } from '../components/AuditLogTable';
import { useTenantStore } from '../store/useTenantStore';

export const AuditLogs: React.FC = () => {
  const { fetchAuditLogs } = useTenantStore();

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800 mb-1">操作审计日志</h1>
        <p className="text-sm text-slate-500">查看所有配额调整的历史操作记录</p>
      </div>
      <AuditLogTable />
    </div>
  );
};
