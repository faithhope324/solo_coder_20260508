import { useSimulationStore } from '../store/useSimulationStore';
import { Building2, TrendingUp, AlertOctagon } from 'lucide-react';

export function WarehouseDetailTable() {
  const { result } = useSimulationStore();

  if (!result) return null;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-cyan-400" />
        <h3 className="text-sm font-medium text-slate-200">仓库运营详情</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="px-3 py-2 text-left text-xs font-medium text-slate-400">
                仓库名称
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">
                平均库存
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">
                缺货天数
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">
                周转率
              </th>
              <th className="px-3 py-2 text-right text-xs font-medium text-slate-400">
                状态
              </th>
            </tr>
          </thead>
          <tbody>
            {result.warehouseResults.map((warehouse) => (
              <tr
                key={warehouse.warehouseId}
                className="border-b border-slate-700/50 transition-colors hover:bg-slate-700/30"
              >
                <td className="px-3 py-3 text-slate-300">{warehouse.warehouseName}</td>
                <td className="px-3 py-3 text-right font-mono text-slate-200">
                  {warehouse.avgInventory}
                </td>
                <td className="px-3 py-3 text-right">
                  <span
                    className={
                      warehouse.stockoutCount > 0
                        ? 'font-mono text-rose-400'
                        : 'font-mono text-emerald-400'
                    }
                  >
                    {warehouse.stockoutCount}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <TrendingUp className="h-3 w-3 text-cyan-400" />
                    <span className="font-mono text-cyan-400">
                      {warehouse.turnoverRate}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  {warehouse.stockoutCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 text-xs text-rose-400">
                      <AlertOctagon className="h-3 w-3" />
                      有缺货
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-400">
                      正常
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
