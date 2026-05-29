import React, { useEffect } from 'react';
import { Building2, AlertTriangle, Cpu, MemoryStick, HardDrive } from 'lucide-react';
import { StatsCard } from '../components/StatsCard';
import { SearchBar } from '../components/SearchBar';
import { TenantCard } from '../components/TenantCard';
import { QuotaModal } from '../components/QuotaModal';
import { useTenantStore } from '../store/useTenantStore';

export const Dashboard: React.FC = () => {
  const { tenants, loading, error, fetchTenants } = useTenantStore();

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const totalTenants = tenants.length;
  const overQuotaCount = tenants.filter(t =>
    t.cpu.used > t.cpu.quota ||
    t.memory.used > t.memory.quota ||
    t.storage.used > t.storage.quota
  ).length;
  const totalCpuQuota = tenants.reduce((sum, t) => sum + t.cpu.quota, 0);
  const totalMemoryQuota = tenants.reduce((sum, t) => sum + t.memory.quota, 0);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="租户总数"
          value={totalTenants}
          icon={Building2}
        />
        <StatsCard
          title="超配额租户"
          value={overQuotaCount}
          icon={AlertTriangle}
          className={overQuotaCount > 0 ? 'border-red-300' : ''}
        />
        <StatsCard
          title="总CPU配额"
          value={`${totalCpuQuota} 核`}
          icon={Cpu}
        />
        <StatsCard
          title="总内存配额"
          value={`${totalMemoryQuota} GB`}
          icon={MemoryStick}
        />
      </div>

      <SearchBar />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {loading && tenants.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/2 mb-4" />
              <div className="space-y-3">
                <div className="h-2 bg-slate-200 rounded" />
                <div className="h-2 bg-slate-200 rounded" />
                <div className="h-2 bg-slate-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-slate-200">
          <HardDrive className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">没有找到匹配的租户</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tenants.map(tenant => (
            <TenantCard key={tenant.id} tenant={tenant} />
          ))}
        </div>
      )}

      <QuotaModal />
    </div>
  );
};
