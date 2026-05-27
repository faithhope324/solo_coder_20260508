import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, DollarSign, Package, AlertTriangle, BarChart3 } from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { ParameterPanel } from '../components/ParameterPanel';
import { SimulationControl } from '../components/SimulationControl';
import { DaySlider } from '../components/DaySlider';
import { KPICard } from '../components/KPICard';
import { InventoryChart } from '../components/InventoryChart';
import { CostPieChart } from '../components/CostPieChart';
import { WarehouseDetailTable } from '../components/WarehouseDetailTable';
import { QuickBatchTest } from '../components/QuickBatchTest';
import { BatchResultSummary } from '../components/BatchResultSummary';

export default function Home() {
  const { params, result, currentDay, isLoading, error, fetchDefaultParams } = useSimulationStore();

  const currentKPIs = (() => {
    if (!result) return null;
    const dayIndex = Math.max(0, Math.min(currentDay - 1, result.dailyKPIs.length - 1));
    const costDayIndex = Math.max(0, Math.min(currentDay - 1, result.dailyCosts.length - 1));
    return {
      turnoverRate: result.dailyKPIs[dayIndex]?.turnoverRate ?? result.inventoryTurnoverRate,
      stockoutRate: result.dailyKPIs[dayIndex]?.stockoutRate ?? result.stockoutRate,
      totalCost: result.dailyCosts[costDayIndex]?.totalCost ?? result.totalCost,
    };
  })();

  useEffect(() => {
    fetchDefaultParams();
  }, [fetchDefaultParams]);

  if (!params && isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent mx-auto" />
          <p className="mt-4 text-slate-400">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 p-2">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">供应链库存优化模拟系统</h1>
                <p className="text-xs text-slate-400">Supply Chain Inventory Optimization</p>
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/30 px-4 py-2">
                <AlertTriangle className="h-4 w-4 text-rose-400" />
                <span className="text-sm text-rose-400">{error}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-6">
            <ParameterPanel />
            <QuickBatchTest />
            <BatchResultSummary />
            <SimulationControl />
          </div>

          <div className="xl:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <KPICard
                title="库存周转率"
                value={currentKPIs?.turnoverRate ?? '--'}
                unit="次/周期"
                icon={<LineChart className="h-6 w-6" />}
                color="cyan"
                trend="neutral"
                trendValue={result && currentDay < params?.simulationDays! ? `截至第${currentDay}天` : '最终值'}
              />
              <KPICard
                title="缺货率"
                value={currentKPIs ? `${currentKPIs.stockoutRate}%` : '--'}
                icon={<AlertTriangle className="h-6 w-6" />}
                color={currentKPIs && currentKPIs.stockoutRate > 5 ? 'rose' : 'emerald'}
                trend="neutral"
                trendValue={result && currentDay < params?.simulationDays! ? `截至第${currentDay}天` : '最终值'}
              />
              <KPICard
                title="总成本"
                value={currentKPIs?.totalCost?.toLocaleString() ?? '--'}
                unit="元"
                icon={<DollarSign className="h-6 w-6" />}
                color="amber"
                trend="neutral"
                trendValue={result && currentDay < params?.simulationDays! ? `截至第${currentDay}天` : '最终值'}
              />
            </div>

            <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 space-y-4">
              <h3 className="text-sm font-medium text-slate-200">各仓库库存水位</h3>
              <InventoryChart />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
                <CostPieChart />
              </div>
              <div className="space-y-6">
                <DaySlider />
                <WarehouseDetailTable />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
