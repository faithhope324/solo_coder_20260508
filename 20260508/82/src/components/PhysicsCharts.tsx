import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Thermometer, Zap } from 'lucide-react';
import useTrajectoryStore from '@/store/useTrajectoryStore';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export function PhysicsCharts() {
  const { physicsHistory } = useTrajectoryStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 0,
    },
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(10, 25, 47, 0.95)',
        titleColor: '#64ffda',
        bodyColor: '#e6f1ff',
        borderColor: 'rgba(100, 255, 218, 0.3)',
        borderWidth: 1,
        padding: 12,
        titleFont: {
          family: "'Orbitron', sans-serif",
          size: 12,
        },
        bodyFont: {
          family: "'JetBrains Mono', monospace",
          size: 11,
        },
        callbacks: {
          title: (items) => {
            const idx = items[0].dataIndex;
            const point = physicsHistory[idx];
            return point ? `Frame ${point.frame} | Time: ${point.time.toFixed(3)} ps` : '';
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          color: 'rgba(100, 255, 218, 0.1)',
        },
        ticks: {
          color: '#8892b0',
          maxTicksLimit: 6,
          font: {
            family: "'JetBrains Mono', monospace",
            size: 10,
          },
          callback: (_, index) => {
            const point = physicsHistory[index];
            return point ? point.frame.toString() : '';
          },
        },
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(100, 255, 218, 0.1)',
        },
        ticks: {
          color: '#8892b0',
          maxTicksLimit: 5,
          font: {
            family: "'JetBrains Mono', monospace",
            size: 10,
          },
        },
      },
    },
  };

  const temperatureData = {
    labels: physicsHistory.map((_, i) => i),
    datasets: [
      {
        label: 'Temperature (K)',
        data: physicsHistory.map((p) => p.temperature),
        borderColor: '#ffb86c',
        backgroundColor: 'rgba(255, 184, 108, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#ffb86c',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const potentialData = {
    labels: physicsHistory.map((_, i) => i),
    datasets: [
      {
        label: 'Potential Energy',
        data: physicsHistory.map((p) => p.potentialEnergy),
        borderColor: '#bd93f9',
        backgroundColor: 'rgba(189, 147, 249, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: '#bd93f9',
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const avgTemperature = physicsHistory.length > 0
    ? physicsHistory.reduce((sum, p) => sum + p.temperature, 0) / physicsHistory.length
    : 0;

  const avgPotential = physicsHistory.length > 0
    ? physicsHistory.reduce((sum, p) => sum + p.potentialEnergy, 0) / physicsHistory.length
    : 0;

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col gap-4 p-4 overflow-auto">
      <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl border border-cyan-500/20 p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Thermometer size={18} className="text-orange-400" />
          <h3 className="text-sm font-bold text-orange-400 tracking-wider">温度变化</h3>
          <span className="ml-auto text-xs font-mono text-slate-400">
            平均: <span className="text-orange-400">{avgTemperature.toFixed(1)} K</span>
          </span>
        </div>
        <div className="h-32 relative">
          {physicsHistory.length > 0 ? (
            <Line data={temperatureData} options={chartOptions} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
              等待数据...
            </div>
          )}
        </div>
        {physicsHistory.length > 0 && (
          <div className="mt-2 flex justify-between text-xs font-mono">
            <span className="text-slate-500">
              当前: <span className="text-orange-400">{physicsHistory[physicsHistory.length - 1].temperature.toFixed(1)} K</span>
            </span>
            <span className="text-slate-500">
              数据点: <span className="text-cyan-400">{physicsHistory.length}</span>
            </span>
          </div>
        )}
      </div>

      <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl border border-purple-500/20 p-4 shadow-xl">
        <div className="flex items-center gap-2 mb-3">
          <Zap size={18} className="text-purple-400" />
          <h3 className="text-sm font-bold text-purple-400 tracking-wider">势能变化</h3>
          <span className="ml-auto text-xs font-mono text-slate-400">
            平均: <span className="text-purple-400">{avgPotential.toFixed(2)}</span>
          </span>
        </div>
        <div className="h-32 relative">
          {physicsHistory.length > 0 ? (
            <Line data={potentialData} options={chartOptions} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
              等待数据...
            </div>
          )}
        </div>
        {physicsHistory.length > 0 && (
          <div className="mt-2 flex justify-between text-xs font-mono">
            <span className="text-slate-500">
              当前: <span className="text-purple-400">{physicsHistory[physicsHistory.length - 1].potentialEnergy.toFixed(2)}</span>
            </span>
            <span className="text-slate-500">
              动能: <span className="text-cyan-400">{physicsHistory[physicsHistory.length - 1].kineticEnergy.toFixed(2)}</span>
            </span>
          </div>
        )}
      </div>

      <div className="bg-slate-900/80 backdrop-blur-sm rounded-xl border border-cyan-500/20 p-4 shadow-xl">
        <h3 className="text-sm font-bold text-cyan-400 tracking-wider mb-3">系统信息</h3>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <InfoItem label="总能量" value={physicsHistory.length > 0 
            ? (physicsHistory[physicsHistory.length - 1].potentialEnergy + physicsHistory[physicsHistory.length - 1].kineticEnergy).toFixed(2)
            : '--'} 
            color="cyan" 
          />
          <InfoItem label="原子数" value="512" color="cyan" />
          <InfoItem label="盒子尺寸" value="20×20×20 Å" color="cyan" />
          <InfoItem label="时间步长" value="0.01 ps" color="cyan" />
        </div>
      </div>
    </div>
  );
}

function InfoItem({ label, value, color }: { label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    cyan: 'text-cyan-400',
    orange: 'text-orange-400',
    purple: 'text-purple-400',
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-slate-500">{label}</span>
      <span className={`font-mono font-bold ${colorClasses[color] || colorClasses.cyan}`}>{value}</span>
    </div>
  );
}

export default PhysicsCharts;
