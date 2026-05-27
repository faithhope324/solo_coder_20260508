import React from 'react';
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
import { MetricsHistory } from '../types';

interface MetricsChartProps {
  data: MetricsHistory[];
}

const MetricsChart: React.FC<MetricsChartProps> = ({ data }) => {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="section">
      <h2 className="section-title">
        <span className="status-dot warning"></span>
        CPU / 内存使用曲线
      </h2>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a78bfa" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTime}
              stroke="#64748b"
              fontSize={12}
            />
            <YAxis yAxisId="left" stroke="#38bdf8" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke="#a78bfa" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                borderRadius: '0.5rem',
                color: '#e2e8f0',
              }}
              labelFormatter={formatTime}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="cpuUsage"
              stroke="#38bdf8"
              strokeWidth={2}
              fill="url(#cpuGradient)"
              name="CPU (%)"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="memoryUsage"
              stroke="#a78bfa"
              strokeWidth={2}
              dot={false}
              name="内存 (MB)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MetricsChart;
