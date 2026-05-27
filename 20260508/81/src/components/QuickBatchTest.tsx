import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Play, ChevronRight, Loader2 } from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { cn } from '@/lib/utils';
import type { SensitivityParameter } from '../../shared/types';

const quickPresets = [
  {
    id: 'safety-stock',
    name: '安全库存优化',
    description: '测试不同安全库存水平对缺货率的影响',
    parameters: [
      { paramName: 'safetyStock' as const, min: 80, max: 250, step: 50 },
    ],
  },
  {
    id: 'reorder-point',
    name: '订货点优化',
    description: '寻找最优订货点以平衡成本与服务水平',
    parameters: [
      { paramName: 'reorderPoint' as const, min: 150, max: 400, step: 50 },
    ],
  },
  {
    id: 'combined',
    name: '组合优化',
    description: '同时优化安全库存和订货点',
    parameters: [
      { paramName: 'safetyStock' as const, min: 100, max: 200, step: 50 },
      { paramName: 'reorderPoint' as const, min: 200, max: 350, step: 50 },
    ],
  },
];

export function QuickBatchTest() {
  const { params, activeWarehouseTab, isLoading, runSensitivity } = useSimulationStore();
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const handleQuickRun = async (presetId: string) => {
    const preset = quickPresets.find((p) => p.id === presetId);
    if (!preset || !params) return;

    setSelectedPreset(presetId);

    const parameters: SensitivityParameter[] = preset.parameters.map((p) => ({
      warehouseId: activeWarehouseTab,
      paramName: p.paramName,
      minValue: p.min,
      maxValue: p.max,
      step: p.step,
    }));

    await runSensitivity(parameters);
    setSelectedPreset(null);
  };

  const activeWarehouse = params?.warehouses.find((w) => w.id === activeWarehouseTab);

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-medium text-slate-200">快速批量测试</h3>
        </div>
        <Link
          to="/sensitivity"
          className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          高级配置
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <p className="text-xs text-slate-500">
        当前仓库: <span className="text-slate-300">{activeWarehouse?.name}</span>
      </p>

      <div className="space-y-2">
        {quickPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleQuickRun(preset.id)}
            disabled={isLoading || !params}
            className={cn(
              'w-full flex items-center justify-between rounded-lg border p-3 text-left transition-all',
              'border-slate-700 bg-slate-900/50 hover:border-amber-500/50 hover:bg-amber-500/5',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <div>
              <div className="text-sm font-medium text-slate-200">{preset.name}</div>
              <div className="text-xs text-slate-500">{preset.description}</div>
              <div className="mt-1 text-[10px] text-slate-600">
                {preset.parameters.map((p, i) => (
                  <span key={i}>
                    {i > 0 && ' + '}
                    {p.paramName === 'safetyStock' ? '安全库存' : '订货点'}: {p.min}-{p.max}
                  </span>
                ))}
              </div>
            </div>
            {selectedPreset === preset.id ? (
              <Loader2 className="h-5 w-5 text-amber-400 animate-spin" />
            ) : (
              <Play className="h-5 w-5 text-amber-400" />
            )}
          </button>
        ))}
      </div>

      <p className="text-[10px] text-slate-600 text-center">
        点击预设方案一键运行批量模拟，自动对比不同参数组合的效果
      </p>
    </div>
  );
}
