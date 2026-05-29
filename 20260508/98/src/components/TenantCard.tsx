import React from 'react';
import { Building2, Cpu, HardDrive, MemoryStick, Settings, AlertTriangle } from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { useTenantStore } from '../store/useTenantStore';
import type { Tenant } from '../shared/types';
import { cn } from '../lib/utils';

interface TenantCardProps {
  tenant: Tenant;
}

export const TenantCard: React.FC<TenantCardProps> = ({ tenant }) => {
  const { openModal } = useTenantStore();

  const hasOverQuota = tenant.cpu.used > tenant.cpu.quota ||
    tenant.memory.used > tenant.memory.quota ||
    tenant.storage.used > tenant.storage.quota;

  return (
    <div className={cn(
      'bg-white rounded-xl p-5 shadow-sm border transition-all duration-200 hover:shadow-lg',
      hasOverQuota ? 'border-red-300 hover:border-red-400' : 'border-slate-200 hover:border-blue-300'
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2.5 rounded-lg',
            hasOverQuota ? 'bg-red-50' : 'bg-blue-50'
          )}>
            <Building2 className={cn('w-5 h-5', hasOverQuota ? 'text-red-600' : 'text-blue-600')} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              {tenant.name}
              {hasOverQuota && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                  <AlertTriangle className="w-3 h-3" />
                  超配额
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500">ID: {tenant.id}</p>
          </div>
        </div>
        <button
          onClick={() => openModal(tenant)}
          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          title="调整配额"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-slate-400" />
          <ProgressBar
            used={tenant.cpu.used}
            quota={tenant.cpu.quota}
            label="CPU"
            unit="核"
          />
        </div>
        <div className="flex items-center gap-2">
          <MemoryStick className="w-4 h-4 text-slate-400" />
          <ProgressBar
            used={tenant.memory.used}
            quota={tenant.memory.quota}
            label="内存"
            unit="GB"
          />
        </div>
        <div className="flex items-center gap-2">
          <HardDrive className="w-4 h-4 text-slate-400" />
          <ProgressBar
            used={tenant.storage.used}
            quota={tenant.storage.quota}
            label="存储"
            unit="TB"
          />
        </div>
      </div>
    </div>
  );
};
