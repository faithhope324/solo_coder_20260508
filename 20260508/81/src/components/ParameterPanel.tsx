import { Warehouse, Settings, BarChart3 } from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { cn } from '@/lib/utils';
import type { DemandModelType } from '../../shared/types';

const demandModelOptions: { value: DemandModelType; label: string; description: string }[] = [
  { value: 'constant', label: '固定需求', description: '每日需求保持稳定' },
  { value: 'trend', label: '趋势需求', description: '需求随时间呈增长趋势' },
  { value: 'seasonal', label: '季节性需求', description: '需求呈现周期性波动' },
  { value: 'random', label: '随机需求', description: '需求高度不确定' },
];

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}

function SliderInput({ label, value, min, max, step = 1, unit, onChange }: SliderInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-400">{label}</span>
        <span className="font-mono text-cyan-400">
          {value}
          {unit && <span className="text-slate-500"> {unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-500"
      />
      <div className="flex justify-between text-xs text-slate-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

export function ParameterPanel() {
  const {
    params,
    activeWarehouseTab,
    setActiveWarehouseTab,
    updateWarehouseParam,
    updateGlobalParam,
  } = useSimulationStore();

  if (!params) return null;

  const activeWarehouse = params.warehouses.find((w) => w.id === activeWarehouseTab);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Settings className="h-5 w-5 text-cyan-400" />
        <h2 className="text-lg font-semibold text-white">参数配置</h2>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 space-y-5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-medium text-slate-200">全局参数</h3>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-400">需求预测模型</label>
            <div className="grid grid-cols-2 gap-2">
              {demandModelOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => updateGlobalParam('demandModel', option.value)}
                  className={cn(
                    'rounded-lg border p-3 text-left text-xs transition-all',
                    params.demandModel === option.value
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                      : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600'
                  )}
                >
                  <div className="font-medium">{option.label}</div>
                  <div className="text-[10px] opacity-70">{option.description}</div>
                </button>
              ))}
            </div>
          </div>

          <SliderInput
            label="模拟周期"
            value={params.simulationDays}
            min={30}
            max={365}
            step={1}
            unit="天"
            onChange={(v) => updateGlobalParam('simulationDays', v)}
          />

          <SliderInput
            label="基础需求量"
            value={params.baseDemand}
            min={20}
            max={200}
            step={1}
            unit="件/天"
            onChange={(v) => updateGlobalParam('baseDemand', v)}
          />

          <SliderInput
            label="需求波动系数"
            value={params.demandVariability}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => updateGlobalParam('demandVariability', v)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/50 p-4 space-y-5">
        <div className="flex items-center gap-2">
          <Warehouse className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-medium text-slate-200">仓库参数</h3>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {params.warehouses.map((warehouse) => (
            <button
              key={warehouse.id}
              onClick={() => setActiveWarehouseTab(warehouse.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm whitespace-nowrap transition-all',
                activeWarehouseTab === warehouse.id
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                  : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600'
              )}
            >
              <Warehouse className="h-4 w-4" />
              {warehouse.name}
            </button>
          ))}
        </div>

        {activeWarehouse && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <SliderInput
                label="安全库存"
                value={activeWarehouse.safetyStock}
                min={50}
                max={500}
                step={10}
                unit="件"
                onChange={(v) => updateWarehouseParam(activeWarehouse.id, 'safetyStock', v)}
              />
              <SliderInput
                label="订货点"
                value={activeWarehouse.reorderPoint}
                min={100}
                max={600}
                step={10}
                unit="件"
                onChange={(v) => updateWarehouseParam(activeWarehouse.id, 'reorderPoint', v)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SliderInput
                label="订货批量"
                value={activeWarehouse.reorderQuantity}
                min={100}
                max={800}
                step={50}
                unit="件"
                onChange={(v) => updateWarehouseParam(activeWarehouse.id, 'reorderQuantity', v)}
              />
              <SliderInput
                label="补货提前期"
                value={activeWarehouse.leadTime}
                min={1}
                max={14}
                step={1}
                unit="天"
                onChange={(v) => updateWarehouseParam(activeWarehouse.id, 'leadTime', v)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SliderInput
                label="单位持有成本率"
                value={activeWarehouse.holdingCostRate}
                min={0.1}
                max={2}
                step={0.05}
                unit="元/件·天"
                onChange={(v) => updateWarehouseParam(activeWarehouse.id, 'holdingCostRate', v)}
              />
              <SliderInput
                label="单次订货成本"
                value={activeWarehouse.orderCost}
                min={50}
                max={500}
                step={10}
                unit="元"
                onChange={(v) => updateWarehouseParam(activeWarehouse.id, 'orderCost', v)}
              />
            </div>

            <SliderInput
              label="单位缺货成本"
              value={activeWarehouse.stockoutCost}
              min={10}
              max={200}
              step={5}
              unit="元/件"
              onChange={(v) => updateWarehouseParam(activeWarehouse.id, 'stockoutCost', v)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
