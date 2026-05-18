import { X, MapPin, Clock, Globe, Activity, Server, Wifi, Cpu, HardDrive, Users, Zap } from 'lucide-react';
import { useNodeStore } from '../../store/nodeStore';
import { STATUS_COLORS, STATUS_LABELS } from '../../types';
import { MiniChart } from './MiniChart';
import { ProgressBar } from './ProgressBar';

export const DetailPanel = () => {
  const { selectedNode, setSelectedNode } = useNodeStore();

  if (!selectedNode) return null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getStatusColor = (value: number, thresholds: [number, number]) => {
    if (value < thresholds[0]) return '#10b981';
    if (value < thresholds[1]) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30"
        onClick={() => setSelectedNode(null)}
      />
      <div className="fixed right-0 top-0 h-full w-full md:w-96 bg-dark-900/95 backdrop-blur-xl border-l border-dark-700 z-40 overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="sticky top-0 z-10 bg-dark-900/90 backdrop-blur-md border-b border-dark-700 p-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-white">{selectedNode.name}</h2>
                <span
                  className="px-2 py-0.5 rounded text-xs font-medium text-white"
                  style={{ backgroundColor: STATUS_COLORS[selectedNode.status] }}
                >
                  {STATUS_LABELS[selectedNode.status]}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-sm text-gray-400">
                <MapPin className="w-3 h-3" />
                <span>{selectedNode.location}</span>
                <span className="text-gray-600">·</span>
                <Globe className="w-3 h-3" />
                <span>{selectedNode.region}</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="p-1.5 rounded-lg hover:bg-dark-700 transition-colors text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-dark-800/50 rounded-xl p-3 border border-dark-700/50">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Activity className="w-3.5 h-3.5" />
                <span>延迟</span>
              </div>
              <div
                className="text-2xl font-mono font-semibold"
                style={{ color: getStatusColor(selectedNode.latency, [100, 200]) }}
              >
                {selectedNode.latency}
                <span className="text-sm text-gray-500 ml-1">ms</span>
              </div>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-3 border border-dark-700/50">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Wifi className="w-3.5 h-3.5" />
                <span>丢包率</span>
              </div>
              <div
                className="text-2xl font-mono font-semibold"
                style={{ color: getStatusColor(selectedNode.packetLoss, [1, 3]) }}
              >
                {selectedNode.packetLoss}
                <span className="text-sm text-gray-500 ml-1">%</span>
              </div>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-3 border border-dark-700/50">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Server className="w-3.5 h-3.5" />
                <span>吞吐量</span>
              </div>
              <div className="text-2xl font-mono font-semibold text-blue-400">
                {selectedNode.throughput}
                <span className="text-sm text-gray-500 ml-1">Mbps</span>
              </div>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-3 border border-dark-700/50">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>可用性</span>
              </div>
              <div className="text-2xl font-mono font-semibold text-emerald-400">
                {selectedNode.availability}
                <span className="text-sm text-gray-500 ml-1">%</span>
              </div>
            </div>
          </div>

          <div className="bg-dark-800/50 rounded-xl p-4 border border-dark-700/50 space-y-3">
            <h3 className="text-sm font-medium text-gray-300">资源使用</h3>
            <ProgressBar
              value={selectedNode.bandwidth}
              color={getStatusColor(selectedNode.bandwidth, [60, 85])}
              label="带宽使用率"
            />
            <ProgressBar
              value={selectedNode.cpuUsage}
              color={getStatusColor(selectedNode.cpuUsage, [60, 85])}
              label="CPU 使用率"
            />
            <ProgressBar
              value={selectedNode.memoryUsage}
              color={getStatusColor(selectedNode.memoryUsage, [65, 85])}
              label="内存使用率"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-dark-800/50 rounded-xl p-3 border border-dark-700/50">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Users className="w-3.5 h-3.5" />
                <span>活跃连接</span>
              </div>
              <div className="text-xl font-mono font-semibold text-purple-400">
                {selectedNode.connections.toLocaleString()}
              </div>
            </div>
            <div className="bg-dark-800/50 rounded-xl p-3 border border-dark-700/50">
              <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                <Zap className="w-3.5 h-3.5" />
                <span>每秒请求</span>
              </div>
              <div className="text-xl font-mono font-semibold text-amber-400">
                {selectedNode.qps.toLocaleString()}
                <span className="text-sm text-gray-500 ml-1">QPS</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-300">历史趋势</h3>
            <MiniChart
              data={selectedNode.history.latency}
              color={getStatusColor(selectedNode.latency, [100, 200])}
              label="延迟趋势"
              unit="ms"
            />
            <MiniChart
              data={selectedNode.history.bandwidth}
              color="#3b82f6"
              label="带宽趋势"
              unit="%"
            />
            <MiniChart
              data={selectedNode.history.packetLoss}
              color={getStatusColor(selectedNode.packetLoss, [1, 3])}
              label="丢包率趋势"
              unit="%"
            />
          </div>

          <div className="pt-2 border-t border-dark-700">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>最后更新</span>
              <span className="font-mono">{formatTime(selectedNode.lastUpdated)}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
              <span>节点 ID</span>
              <span className="font-mono">{selectedNode.id}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
