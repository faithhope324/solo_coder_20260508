import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Play,
  Plus,
  Trash2,
  BarChart3,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Loader2,
  Package,
  ArrowUpDown,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSimulationStore } from '../store/useSimulationStore';
import { KPICard } from '../components/KPICard';
import type { SensitivityParameter } from '../../shared/types';
import { cn } from '@/lib/utils';

interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export default function Sensitivity() {
  const {
    params,
    sensitivityResult,
    isLoading,
    fetchDefaultParams,
    runSensitivity,
  } = useSimulationStore();

  const [parameters, setParameters] = useState<SensitivityParameter[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  useEffect(() => {
    if (!params) {
      fetchDefaultParams();
    } else if (params.warehouses.length > 0 && parameters.length === 0) {
      setParameters([
        {
          warehouseId: params.warehouses[0].id,
          paramName: 'safetyStock',
          minValue: 100,
          maxValue: 250,
          step: 50,
        },
      ]);
    }
  }, [params, fetchDefaultParams, parameters.length]);

  const addParameter = () => {
    if (!params || params.warehouses.length === 0) return;
    setParameters([
      ...parameters,
      {
        warehouseId: params.warehouses[0].id,
        paramName: 'safetyStock',
        minValue: 100,
        maxValue: 200,
        step: 50,
      },
    ]);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const updateParameter = (
    index: number,
    field: keyof SensitivityParameter,
    value: string | number
  ) => {
    const newParams = [...parameters];
    (newParams[index] as unknown as Record<string, string | number>)[field] = value;
    setParameters(newParams);
  };

  const handleRunSensitivity = () => {
    if (parameters.length === 0) return;
    runSensitivity(parameters);
  };

  const getScenarioCount = () => {
    let count = 1;
    for (const p of parameters) {
      const steps = Math.floor((p.maxValue - p.minValue) / p.step) + 1;
      count *= Math.max(1, steps);
    }
    return count;
  };

  const sortedScenarios = () => {
    if (!sensitivityResult) return [];
    if (!sortConfig) return sensitivityResult.scenarios;

    return [...sensitivityResult.scenarios].sort((a, b) => {
      let aVal: number, bVal: number;

      if (sortConfig.key === 'totalCost') {
        aVal = a.result.totalCost;
        bVal = b.result.totalCost;
      } else if (sortConfig.key === 'stockoutRate') {
        aVal = a.result.stockoutRate;
        bVal = b.result.stockoutRate;
      } else if (sortConfig.key === 'turnover') {
        aVal = a.result.inventoryTurnoverRate;
        bVal = b.result.inventoryTurnoverRate;
      } else {
        aVal = a.params[sortConfig.key] ?? 0;
        bVal = b.params[sortConfig.key] ?? 0;
      }

      return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
    });
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  const bestScenario = sortedScenarios()[0];

  if (!params) {
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
        <div className="max-w-[1400px] mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-200"
            >
              <ArrowLeft className="h-4 w-4" />
              返回
            </Link>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-2">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">参数敏感性分析</h1>
                <p className="text-xs text-slate-400">Parameter Sensitivity Analysis</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-200">分析参数配置</h3>
                <button
                  onClick={addParameter}
                  className="flex items-center gap-1 rounded-lg bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-400 transition-colors hover:bg-cyan-500/20"
                >
                  <Plus className="h-3 w-3" />
                  添加参数
                </button>
              </div>

              <div className="space-y-4">
                {parameters.map((param, index) => {
                  const warehouse = params.warehouses.find(
                    (w) => w.id === param.warehouseId
                  );
                  return (
                    <div
                      key={index}
                      className="rounded-lg border border-slate-700/50 bg-slate-900/50 p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-300">
                          参数组 {index + 1}
                        </span>
                        {parameters.length > 1 && (
                          <button
                            onClick={() => removeParameter(index)}
                            className="text-rose-400 hover:text-rose-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-slate-400">选择仓库</label>
                        <select
                          value={param.warehouseId}
                          onChange={(e) =>
                            updateParameter(index, 'warehouseId', e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                        >
                          {params.warehouses.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs text-slate-400">分析参数</label>
                        <select
                          value={param.paramName}
                          onChange={(e) =>
                            updateParameter(
                              index,
                              'paramName',
                              e.target.value as 'safetyStock' | 'reorderPoint'
                            )
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
                        >
                          <option value="safetyStock">安全库存</option>
                          <option value="reorderPoint">订货点</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">最小值</label>
                          <input
                            type="number"
                            value={param.minValue}
                            onChange={(e) =>
                              updateParameter(index, 'minValue', Number(e.target.value))
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">最大值</label>
                          <input
                            type="number"
                            value={param.maxValue}
                            onChange={(e) =>
                              updateParameter(index, 'maxValue', Number(e.target.value))
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500">步长</label>
                          <input
                            type="number"
                            value={param.step}
                            onChange={(e) =>
                              updateParameter(index, 'step', Number(e.target.value))
                            }
                            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="text-xs text-slate-500">
                        当前值:{' '}
                        <span className="font-mono text-cyan-400">
                          {warehouse?.[param.paramName]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="rounded-lg bg-slate-900/50 p-3 text-xs text-slate-400">
                将生成 <span className="font-mono text-cyan-400">{getScenarioCount()}</span>{' '}
                个模拟场景
              </div>

              <button
                onClick={handleRunSensitivity}
                disabled={isLoading || parameters.length === 0}
                className={cn(
                  'flex w-full items-center justify-center gap-2 rounded-xl px-6 py-4',
                  'bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium',
                  'transition-all duration-300 hover:from-amber-400 hover:to-orange-500',
                  'hover:shadow-lg hover:shadow-amber-500/25',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>批量模拟中...</span>
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5" />
                    <span>运行敏感性分析</span>
                  </>
                )}
              </button>
            </div>

            {bestScenario && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-4">
                <h3 className="text-sm font-medium text-emerald-400">最优方案推荐</h3>
                <div className="space-y-3">
                  {Object.entries(bestScenario.params).map(([key, value]) => {
                    const [warehouseId, paramName] = key.split('_');
                    const warehouse = params.warehouses.find((w) => w.id === warehouseId);
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="text-slate-400">
                          {warehouse?.name} -{' '}
                          {paramName === 'safetyStock' ? '安全库存' : '订货点'}
                        </span>
                        <span className="font-mono text-emerald-400">{value}</span>
                      </div>
                    );
                  })}
                  <div className="border-t border-emerald-500/20 pt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">总成本</span>
                      <span className="font-mono text-emerald-400">
                        ¥{bestScenario.result.totalCost.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">缺货率</span>
                      <span className="font-mono text-emerald-400">
                        {bestScenario.result.stockoutRate}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {sensitivityResult && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <KPICard
                    title="分析场景数"
                    value={sensitivityResult.scenarios.length}
                    icon={<Package className="h-6 w-6" />}
                    color="cyan"
                  />
                  <KPICard
                    title="最低总成本"
                    value={Math.min(
                      ...sensitivityResult.scenarios.map((s) => s.result.totalCost)
                    ).toLocaleString()}
                    unit="元"
                    icon={<DollarSign className="h-6 w-6" />}
                    color="emerald"
                  />
                  <KPICard
                    title="最低缺货率"
                    value={`${Math.min(
                      ...sensitivityResult.scenarios.map((s) => s.result.stockoutRate)
                    ).toFixed(2)}%`}
                    icon={<AlertTriangle className="h-6 w-6" />}
                    color="amber"
                  />
                </div>

                <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-slate-200">场景对比结果</h3>
                    <div className="text-xs text-slate-500">
                      点击表头排序 · 绿色为最优
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-700">
                          {parameters.map((p) => {
                            const warehouse = params.warehouses.find(
                              (w) => w.id === p.warehouseId
                            );
                            const key = `${p.warehouseId}_${p.paramName}`;
                            return (
                              <th
                                key={key}
                                onClick={() => handleSort(key)}
                                className="cursor-pointer px-3 py-2 text-left text-xs font-medium text-slate-400 hover:text-slate-200"
                              >
                                <div className="flex items-center gap-1">
                                  {warehouse?.name}
                                  <br />
                                  {p.paramName === 'safetyStock'
                                    ? '安全库存'
                                    : '订货点'}
                                  <ArrowUpDown className="h-3 w-3" />
                                </div>
                              </th>
                            );
                          })}
                          <th
                            onClick={() => handleSort('totalCost')}
                            className="cursor-pointer px-3 py-2 text-right text-xs font-medium text-slate-400 hover:text-slate-200"
                          >
                            <div className="flex items-center justify-end gap-1">
                              总成本
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </th>
                          <th
                            onClick={() => handleSort('stockoutRate')}
                            className="cursor-pointer px-3 py-2 text-right text-xs font-medium text-slate-400 hover:text-slate-200"
                          >
                            <div className="flex items-center justify-end gap-1">
                              缺货率
                              <ArrowUpDown className="h-3 w-3" />
                            </div>
                          </th>
                          <th
                            onClick={() => handleSort('turnover')}
                            className="cursor-pointer px-3 py-2 text-right text-xs font-medium text-slate-400 hover:text-slate-200"
                          >
                            <div className="flex items-center justify-end gap-1">
                              周转率
                              <TrendingUp className="h-3 w-3" />
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedScenarios().map((scenario, idx) => {
                          const isBest = idx === 0;
                          return (
                            <tr
                              key={idx}
                              className={cn(
                                'border-b border-slate-700/50 transition-colors hover:bg-slate-700/30',
                                isBest && 'bg-emerald-500/5'
                              )}
                            >
                              {parameters.map((p) => {
                                const key = `${p.warehouseId}_${p.paramName}`;
                                return (
                                  <td
                                    key={key}
                                    className={cn(
                                      'px-3 py-3 font-mono',
                                      isBest ? 'text-emerald-400' : 'text-slate-200'
                                    )}
                                  >
                                    {scenario.params[key]}
                                  </td>
                                );
                              })}
                              <td
                                className={cn(
                                  'px-3 py-3 text-right font-mono',
                                  isBest ? 'text-emerald-400' : 'text-slate-200'
                                )}
                              >
                                ¥{scenario.result.totalCost.toLocaleString()}
                              </td>
                              <td
                                className={cn(
                                  'px-3 py-3 text-right font-mono',
                                  scenario.result.stockoutRate > 5
                                    ? 'text-rose-400'
                                    : isBest
                                      ? 'text-emerald-400'
                                      : 'text-slate-200'
                                )}
                              >
                                {scenario.result.stockoutRate}%
                              </td>
                              <td
                                className={cn(
                                  'px-3 py-3 text-right font-mono',
                                  isBest ? 'text-emerald-400' : 'text-cyan-400'
                                )}
                              >
                                {scenario.result.inventoryTurnoverRate}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {!sensitivityResult && !isLoading && (
              <div className="flex h-96 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-800/30">
                <div className="text-center">
                  <BarChart3 className="mx-auto h-12 w-12 text-slate-600" />
                  <p className="mt-3 text-sm text-slate-500">
                    配置参数后运行敏感性分析查看结果
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
