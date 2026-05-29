import React from 'react';
import { Clock, User, Edit3, ChevronLeft, ChevronRight, Cpu, MemoryStick, HardDrive } from 'lucide-react';
import { useTenantStore } from '../store/useTenantStore';
import type { AuditLog } from '../shared/types';

const formatTime = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const getResourceIcon = (resource: string) => {
  switch (resource) {
    case 'cpu': return <Cpu className="w-3 h-3" />;
    case 'memory': return <MemoryStick className="w-3 h-3" />;
    case 'storage': return <HardDrive className="w-3 h-3" />;
    default: return null;
  }
};

const getResourceName = (resource: string): string => {
  switch (resource) {
    case 'cpu': return 'CPU';
    case 'memory': return '内存';
    case 'storage': return '存储';
    default: return resource;
  }
};

const getUnit = (resource: string): string => {
  switch (resource) {
    case 'cpu': return '核';
    case 'memory': return 'GB';
    case 'storage': return 'TB';
    default: return '';
  }
};

const ChangeDetail: React.FC<{ changes: AuditLog['changes'] }> = ({ changes }) => {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {changes.map((change, idx) => (
        <div key={idx} className="flex items-center gap-1 text-xs">
          {getResourceIcon(change.resource)}
          <span className="text-slate-500">{getResourceName(change.resource)}:</span>
          <span className="font-medium text-slate-700">{change.oldValue}{getUnit(change.resource)}</span>
          <span className="text-slate-400">→</span>
          <span className="font-medium text-blue-600">{change.newValue}{getUnit(change.resource)}</span>
        </div>
      ))}
    </div>
  );
};

export const AuditLogTable: React.FC = () => {
  const { auditLogs, auditLogsTotal, currentPage, pageSize, loading, setCurrentPage } = useTenantStore();
  const totalPages = Math.ceil(auditLogsTotal / pageSize);

  if (loading && auditLogs.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="animate-pulse text-slate-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="w-44 px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  操作时间
                </div>
              </th>
              <th className="w-24 px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  操作人
                </div>
              </th>
              <th className="w-28 px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <div className="flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  操作类型
                </div>
              </th>
              <th className="w-32 px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                租户
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                变更详情
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {auditLogs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  暂无操作记录
                </td>
              </tr>
            ) : (
              auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="w-44 px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                    {formatTime(log.timestamp)}
                  </td>
                  <td className="w-24 px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                      <User className="w-2.5 h-2.5" />
                      {log.operator}
                    </span>
                  </td>
                  <td className="w-28 px-4 py-3 text-sm">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium">
                      <Edit3 className="w-2.5 h-2.5" />
                      调整配额
                    </span>
                  </td>
                  <td className="w-32 px-4 py-3 text-sm font-medium text-slate-800 truncate">
                    {log.tenantName}
                  </td>
                  <td className="px-4 py-3">
                    <ChangeDetail changes={log.changes} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
          <p className="text-sm text-slate-600">
            共 <span className="font-medium text-slate-800">{auditLogsTotal}</span> 条记录
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-sm text-slate-600">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
