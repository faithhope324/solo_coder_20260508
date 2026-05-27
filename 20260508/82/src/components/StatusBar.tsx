import { Wifi, WifiOff, Activity, Database, HardDrive } from 'lucide-react';
import useTrajectoryStore from '@/store/useTrajectoryStore';
import { formatBytes } from '@/utils/binaryParser';

export function StatusBar() {
  const { connectionStatus, fps, compressionRatio, totalBytesReceived, meta } = useTrajectoryStore();

  const statusConfig = {
    disconnected: { icon: WifiOff, color: 'text-red-500', bg: 'bg-red-500/20', text: '未连接' },
    connecting: { icon: Wifi, color: 'text-yellow-500', bg: 'bg-yellow-500/20', text: '连接中...' },
    connected: { icon: Wifi, color: 'text-green-500', bg: 'bg-green-500/20', text: '已连接' },
    error: { icon: WifiOff, color: 'text-red-500', bg: 'bg-red-500/20', text: '连接错误' },
  };

  const config = statusConfig[connectionStatus];
  const StatusIcon = config.icon;

  return (
    <div className="w-full h-8 px-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${config.bg} flex items-center justify-center`}>
            <div className={`w-1.5 h-1.5 rounded-full ${config.color} ${connectionStatus === 'connected' ? 'animate-pulse' : ''}`} />
          </div>
          <StatusIcon size={12} className={config.color} />
          <span className={config.color}>{config.text}</span>
        </div>

        {meta && (
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-slate-500">系统:</span>
            <span className="text-cyan-400 font-medium">{meta.systemName}</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-500">原子:</span>
            <span className="text-cyan-400 font-mono">{meta.atomCount}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2 text-slate-400">
          <Activity size={12} className="text-cyan-400" />
          <span className="text-slate-500">FPS:</span>
          <span className="text-cyan-400 font-mono font-bold min-w-[40px]">{fps.toFixed(0)}</span>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <Database size={12} className="text-purple-400" />
          <span className="text-slate-500">压缩率:</span>
          <span className={`font-mono font-bold min-w-[50px] ${
            compressionRatio > 70 ? 'text-green-400' : compressionRatio > 50 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {compressionRatio.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center gap-2 text-slate-400">
          <HardDrive size={12} className="text-orange-400" />
          <span className="text-slate-500">已接收:</span>
          <span className="text-orange-400 font-mono font-bold min-w-[70px]">{formatBytes(totalBytesReceived)}</span>
        </div>
      </div>
    </div>
  );
}

export default StatusBar;
