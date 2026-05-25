import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useTransactionStore } from '../store/useTransactionStore';
import { TrendingUp } from 'lucide-react';

export function DetectionChart() {
  const { detectionRateHistory } = useTransactionStore();

  const data = detectionRateHistory.map((point) => ({
    ...point,
    displayTime: point.time.slice(3),
  }));

  return (
    <div className="relative bg-slate-900/90 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-semibold text-slate-200">欺诈检测率</h2>
          </div>
          <span className="text-xs text-slate-500 font-mono">最近 10 分钟</span>
        </div>
      </div>

      <div className="p-4 h-64">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            <p className="text-sm">等待数据...</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" opacity={0.8} />
              <XAxis
                dataKey="displayTime"
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #475569',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
                labelStyle={{ color: '#cbd5e1', marginBottom: '4px' }}
                formatter={(value: number) => [`${value.toFixed(2)}%`, '欺诈率']}
                itemStyle={{ color: '#fca5a5' }}
              />
              <Area
                type="monotone"
                dataKey="rate"
                stroke="#f87171"
                strokeWidth={3}
                fill="url(#colorRate)"
                dot={false}
                activeDot={{ r: 5, fill: '#f87171', strokeWidth: 2, stroke: '#1e293b' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
