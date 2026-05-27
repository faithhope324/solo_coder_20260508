import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { useSimulationStore } from '../store/useSimulationStore';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChartDataPoint {
  name: string;
  inventory: number;
  safetyStock: number;
  reorderPoint: number;
  status: 'normal' | 'warning' | 'danger';
}

export function InventoryChart() {
  const { params, result, currentDay } = useSimulationStore();

  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!params || !result) return [];

    return params.warehouses.map((warehouse) => {
      const inventoryArray = result.dailyInventory[warehouse.id] || [];
      const displayInventory =
        inventoryArray[Math.min(currentDay, inventoryArray.length - 1)] ||
        warehouse.initialInventory;

      let status: 'normal' | 'warning' | 'danger' = 'normal';
      if (displayInventory < warehouse.safetyStock) {
        status = 'danger';
      } else if (displayInventory < warehouse.reorderPoint) {
        status = 'warning';
      }

      return {
        name: warehouse.name,
        inventory: displayInventory,
        safetyStock: warehouse.safetyStock,
        reorderPoint: warehouse.reorderPoint,
        status,
      };
    });
  }, [params, result, currentDay]);

  const getBarColor = (status: ChartDataPoint['status']) => {
    switch (status) {
      case 'danger':
        return '#EF4444';
      case 'warning':
        return '#F59E0B';
      default:
        return '#06B6D4';
    }
  };

  const maxValue = useMemo(() => {
    if (!chartData.length) return 100;
    const maxInventory = Math.max(...chartData.map((d) => d.inventory));
    const maxReorder = Math.max(...chartData.map((d) => d.reorderPoint));
    return Math.ceil(Math.max(maxInventory, maxReorder) * 1.2);
  }, [chartData]);

  if (!params || !result) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-800/30">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-2 text-sm text-slate-500">运行模拟后显示库存水位图</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-cyan-500" />
          <span className="text-xs text-slate-400">正常</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-amber-500" />
          <span className="text-xs text-slate-400">低于订货点</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded-full bg-rose-500" />
          <span className="text-xs text-slate-400">低于安全库存</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-px w-6 border-t-2 border-dashed border-amber-400" />
          <span className="text-xs text-slate-400">订货点</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-px w-6 border-t-2 border-dashed border-rose-400" />
          <span className="text-xs text-slate-400">安全库存</span>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="colorWarning" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.2} />
              </linearGradient>
              <linearGradient id="colorDanger" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0.2} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 12 }} />
            <YAxis
              domain={[0, maxValue]}
              tick={{ fill: '#94A3B8', fontSize: 12 }}
              label={{ value: '库存数量', angle: -90, position: 'insideLeft', fill: '#64748B' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#E2E8F0',
              }}
              formatter={(value: number) => [`${value} 件`, '当前库存']}
            />
            <Bar
              dataKey="inventory"
              radius={[8, 8, 0, 0]}
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.status === 'danger'
                      ? 'url(#colorDanger)'
                      : entry.status === 'warning'
                        ? 'url(#colorWarning)'
                        : 'url(#colorNormal)'
                  }
                />
              ))}
            </Bar>
            {chartData.map((entry, index) => (
              <ReferenceLine
                key={`reorder-${index}`}
                x={index}
                y={entry.reorderPoint}
                stroke="#F59E0B"
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
            ))}
            {chartData.map((entry, index) => (
              <ReferenceLine
                key={`safety-${index}`}
                x={index}
                y={entry.safetyStock}
                stroke="#EF4444"
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/30 px-4 py-3">
        <div className="flex items-center gap-2">
          {result.stockoutRate > 5 ? (
            <AlertTriangle className="h-5 w-5 text-rose-400" />
          ) : (
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          )}
          <span className="text-sm text-slate-300">
            模拟第 <span className="font-mono text-cyan-400">{currentDay}</span> 天
          </span>
        </div>
        <div className="flex items-center gap-6">
          {chartData.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <div
                className={cn(
                  'h-2 w-2 rounded-full',
                  d.status === 'danger'
                    ? 'bg-rose-500'
                    : d.status === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                )}
              />
              <span className="text-xs text-slate-400">
                {d.name}:{' '}
                <span className="font-mono text-slate-200">{d.inventory}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
