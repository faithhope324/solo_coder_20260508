import { RefreshCw, Play, Pause, Clock } from 'lucide-react';
import { useNodeStore } from '../../store/nodeStore';

const INTERVAL_OPTIONS = [
  { value: 5000, label: '5秒' },
  { value: 10000, label: '10秒' },
  { value: 30000, label: '30秒' },
  { value: 60000, label: '60秒' },
];

export const RefreshControl = () => {
  const {
    isRefreshing,
    autoRefresh,
    setAutoRefresh,
    refreshInterval,
    setRefreshInterval,
    refreshData,
    lastRefreshed,
  } = useNodeStore();

  const formatTime = (date: Date | null) => {
    if (!date) return '--';
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Clock className="w-3.5 h-3.5" />
        <span>最后更新: {formatTime(lastRefreshed)}</span>
      </div>

      <div className="h-4 w-px bg-dark-600" />

      <button
        onClick={() => refreshData()}
        disabled={isRefreshing}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-dark-700 hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-gray-300 transition-all"
      >
        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span>刷新</span>
      </button>

      <button
        onClick={() => setAutoRefresh(!autoRefresh)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all ${
          autoRefresh
            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
        }`}
      >
        {autoRefresh ? (
          <>
            <Pause className="w-4 h-4" />
            <span>自动</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            <span>自动</span>
          </>
        )}
      </button>

      <select
        value={refreshInterval}
        onChange={(e) => setRefreshInterval(Number(e.target.value))}
        className="px-2 py-1.5 bg-dark-700 hover:bg-dark-600 rounded-lg text-sm text-gray-300 border-none outline-none cursor-pointer transition-all"
      >
        {INTERVAL_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-dark-800">
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};
