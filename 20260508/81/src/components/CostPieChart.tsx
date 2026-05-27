import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { useSimulationStore } from '../store/useSimulationStore';
import { PieChart as PieChartIcon, AlertTriangle, Clock } from 'lucide-react';

const COLORS = {
  orderingCost: '#06B6D4',
  holdingCost: '#10B981',
  stockoutCost: '#EF4444',
  transportCost: '#F59E0B',
};

const LABELS = {
  orderingCost: '订货成本',
  holdingCost: '持有成本',
  stockoutCost: '缺货成本',
  transportCost: '运输成本',
};

export function CostPieChart() {
  const { result, currentDay, params } = useSimulationStore();

  const pieData = useMemo(() => {
    if (!result) return [];

    const dayIndex = Math.max(0, Math.min(currentDay - 1, result.dailyCosts?.length - 1 || 0));
    const costData = result.dailyCosts?.[dayIndex] || result.costBreakdown;
    const totalCost = 'totalCost' in costData ? costData.totalCost : result.totalCost;

    return Object.entries(costData)
      .filter(([key]) => key !== 'totalCost')
      .map(([key, value]) => ({
        name: LABELS[key as keyof typeof LABELS] || key,
        value: value as number,
        percentage: totalCost > 0 ? (((value as number) / totalCost) * 100).toFixed(1) : '0.0',
      }));
  }, [result, currentDay]);

  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
    name,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
    name: string;
  }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null;

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (!result) {
    return (
      <div className="flex h-80 items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-800/30">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-10 w-10 text-slate-600" />
          <p className="mt-2 text-sm text-slate-500">运行模拟后显示成本构成</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <PieChartIcon className="h-5 w-5 text-cyan-400" />
        <h3 className="text-sm font-medium text-slate-200">成本构成分析</h3>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={100}
              innerRadius={50}
              paddingAngle={3}
              dataKey="value"
              animationDuration={1000}
              animationEasing="ease-out"
            >
              {pieData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    COLORS[
                      Object.keys(result.costBreakdown)[
                        index
                      ] as keyof typeof COLORS
                    ]
                  }
                  stroke="#1E293B"
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                borderRadius: '8px',
                color: '#E2E8F0',
              }}
              formatter={(value: number, name: string) => [
                `¥${value.toLocaleString()}`,
                name,
              ]}
            />
            <Legend
              formatter={(value) => (
                <span className="text-xs text-slate-400">{value}</span>
              )}
              wrapperStyle={{ paddingTop: '20px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {pieData.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{
                  backgroundColor:
                    COLORS[
                      Object.keys(result.costBreakdown).find(
                        (k) =>
                          LABELS[k as keyof typeof LABELS] === item.name
                      ) as keyof typeof COLORS
                    ],
                }}
              />
              <span className="text-xs text-slate-400">{item.name}</span>
            </div>
            <div className="text-right">
              <div className="font-mono text-sm text-slate-200">
                ¥{item.value.toLocaleString()}
              </div>
              <div className="text-[10px] text-slate-500">{item.percentage}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
