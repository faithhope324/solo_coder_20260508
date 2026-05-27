import { Link } from 'react-router-dom';
import { BarChart3, ChevronRight, CheckCircle2, TrendingDown } from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';

export function BatchResultSummary() {
  const { sensitivityResult, params } = useSimulationStore();

  if (!sensitivityResult || sensitivityResult.scenarios.length === 0) {
    return null;
  }

  const bestScenario = sensitivityResult.scenarios.reduce((best, current) =>
    current.result.totalCost < best.result.totalCost ? current : best
  );

  const avgCost =
    sensitivityResult.scenarios.reduce((sum, s) => sum + s.result.totalCost, 0) /
    sensitivityResult.scenarios.length;

  const costImprovement = (((avgCost - bestScenario.result.totalCost) / avgCost) * 100).toFixed(1);

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-emerald-400">批量测试完成</h3>
        </div>
        <Link
          to="/sensitivity"
          className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          查看详情
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <div className="font-mono text-2xl font-bold text-emerald-400">
            {sensitivityResult.scenarios.length}
          </div>
          <div className="text-[10px] text-slate-500">测试场景</div>
        </div>
        <div className="text-center">
          <div className="font-mono text-xl font-bold text-emerald-400">
            ¥{bestScenario.result.totalCost.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500">最优成本</div>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1">
            <TrendingDown className="h-3 w-3 text-emerald-400" />
            <span className="font-mono text-lg font-bold text-emerald-400">
              -{costImprovement}%
            </span>
          </div>
          <div className="text-[10px] text-slate-500">成本优化</div>
        </div>
      </div>

      <div className="rounded-lg bg-slate-900/50 p-3">
        <div className="text-xs text-slate-400 mb-2">最优参数组合</div>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(bestScenario.params).map(([key, value]) => {
            const [warehouseId, paramName] = key.split('_');
            const warehouse = params?.warehouses.find((w) => w.id === warehouseId);
            return (
              <div key={key} className="text-xs">
                <span className="text-slate-500">
                  {warehouse?.name || warehouseId} -{' '}
                  {paramName === 'safetyStock' ? '安全库存' : '订货点'}:
                </span>
                <span className="ml-1 font-mono text-emerald-400">{value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
