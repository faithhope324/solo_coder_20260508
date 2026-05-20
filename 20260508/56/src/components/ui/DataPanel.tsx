import { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
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
} from 'chart.js';
import { useSimulationStore } from '../../store/useSimulationStore';
import { Activity, Zap, Target, Info } from 'lucide-react';

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

export function DataPanel() {
  const {
    energyHistory,
    currentStepData,
    planets,
    selectedPlanetId,
    currentStepData: stepData,
  } = useSimulationStore();

  const selectedPlanet = useMemo(() => {
    if (!selectedPlanetId) return null;
    return planets.find(p => p.id === selectedPlanetId);
  }, [selectedPlanetId, planets]);

  const selectedPlanetIndex = useMemo(() => {
    if (!selectedPlanet) return -1;
    return planets.findIndex(p => p.id === selectedPlanet.id);
  }, [selectedPlanet, planets]);

  const totalMass = useMemo(() => {
    return planets.reduce((sum, p) => sum + p.mass, 0);
  }, [planets]);

  const energyChartData = useMemo(() => {
    const labels = energyHistory.map(e => e.time.toFixed(1));
    const normalize = (val: number, min: number, max: number) => {
      if (max === min) return 0;
      return ((val - min) / (max - min)) * 100;
    };

    const allValues = energyHistory.flatMap(e => [e.total, e.kinetic, e.potential]);
    const minVal = Math.min(...allValues);
    const maxVal = Math.max(...allValues);

    return {
      labels,
      datasets: [
        {
          label: '总能量',
          data: energyHistory.map(e => normalize(e.total, minVal, maxVal)),
          borderColor: '#ff9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 2,
        },
        {
          label: '动能',
          data: energyHistory.map(e => normalize(e.kinetic, minVal, maxVal)),
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 1,
        },
        {
          label: '势能',
          data: energyHistory.map(e => normalize(e.potential, minVal, maxVal)),
          borderColor: '#f44336',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          fill: false,
          tension: 0.4,
          pointRadius: 0,
          borderWidth: 1,
        },
      ],
    };
  }, [energyHistory]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const,
        labels: {
          color: '#e0e0e0',
          font: { size: 10 },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(10, 14, 26, 0.9)',
        titleColor: '#e0e0e0',
        bodyColor: '#e0e0e0',
        borderColor: 'rgba(100, 181, 246, 0.3)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        display: true,
        grid: { color: 'rgba(100, 181, 246, 0.1)' },
        ticks: { color: '#888', maxTicksLimit: 5, font: { size: 9 } },
      },
      y: {
        display: true,
        grid: { color: 'rgba(100, 181, 246, 0.1)' },
        ticks: { color: '#888', font: { size: 9 } },
        title: {
          display: true,
          text: '归一化能量 (%)',
          color: '#888',
          font: { size: 9 },
        },
      },
    },
    animation: false,
  };

  return (
    <div className="w-72 h-full glass-panel flex flex-col">
      <div className="p-4 border-b border-planet-blue/20">
        <h2 className="text-xl font-bold text-planet-blue glow-text font-orbitron">
          数据监控
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={<Target className="w-4 h-4" />}
            label="天体数量"
            value={planets.length.toString()}
            color="text-planet-blue"
          />
          <StatCard
            icon={<Activity className="w-4 h-4" />}
            label="总质量"
            value={totalMass.toFixed(2)}
            color="text-energy-orange"
          />
        </div>

        {currentStepData && (
          <div className="bg-space-dark/50 border border-planet-blue/20 rounded p-3 space-y-2">
            <div className="flex items-center gap-2 text-energy-orange">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-medium">能量数据</span>
            </div>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <DataRow label="总能量" value={currentStepData.totalEnergy.toExponential(4)} color="#ff9800" />
              <DataRow label="动能" value={currentStepData.kineticEnergy.toExponential(4)} color="#4caf50" />
              <DataRow label="势能" value={currentStepData.potentialEnergy.toExponential(4)} color="#f44336" />
            </div>
          </div>
        )}

        {currentStepData && (
          <div className="bg-space-dark/50 border border-com-green/20 rounded p-3 space-y-2">
            <div className="flex items-center gap-2 text-com-green">
              <Target className="w-4 h-4" />
              <span className="text-sm font-medium">质心坐标</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-xs">
              <DataRow label="X" value={currentStepData.centerOfMass[0].toFixed(3)} color="#4caf50" />
              <DataRow label="Y" value={currentStepData.centerOfMass[1].toFixed(3)} color="#4caf50" />
              <DataRow label="Z" value={currentStepData.centerOfMass[2].toFixed(3)} color="#4caf50" />
            </div>
          </div>
        )}

        {energyHistory.length > 2 && (
          <div className="bg-space-dark/50 border border-planet-blue/20 rounded p-3">
            <h3 className="text-sm font-medium text-gray-300 mb-2">能量变化曲线</h3>
            <div className="h-40">
              <Line data={energyChartData} options={chartOptions} />
            </div>
          </div>
        )}

        {selectedPlanet && stepData && selectedPlanetIndex >= 0 && (
          <div className="bg-space-dark/50 border border-planet-blue/30 rounded p-3">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: selectedPlanet.color }}
              />
              <span className="text-sm font-medium text-white">{selectedPlanet.name}</span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-gray-400">质量:</span>
                <span className="text-white ml-2">{selectedPlanet.mass.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-400">位置:</span>
                <div className="text-white ml-2 font-mono">
                  ({stepData.positions[selectedPlanetIndex]?.map(v => v.toFixed(2)).join(', ')})
                </div>
              </div>
              <div>
                <span className="text-gray-400">速度:</span>
                <div className="text-white ml-2 font-mono">
                  ({stepData.velocities[selectedPlanetIndex]?.map(v => v.toFixed(2)).join(', ')})
                </div>
              </div>
            </div>
          </div>
        )}

        {!selectedPlanet && (
          <div className="bg-space-dark/30 border border-gray-700/30 rounded p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-gray-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-500">
              点击场景中的行星查看详细信息
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="bg-space-dark/50 border border-planet-blue/20 rounded p-3">
      <div className={`flex items-center gap-1 ${color} mb-1`}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-xl font-bold text-white">{value}</div>
    </div>
  );
}

interface DataRowProps {
  label: string;
  value: string;
  color: string;
}

function DataRow({ label, value, color }: DataRowProps) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span style={{ color }} className="font-mono">{value}</span>
    </div>
  );
}
