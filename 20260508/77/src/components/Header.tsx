import { useEffect, useState } from 'react';
import { Shield, Wifi, WifiOff, Clock, Activity } from 'lucide-react';
import { useTransactionStore } from '../store/useTransactionStore';

export function Header() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const { isConnected } = useTransactionStore();

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-cyan-500/30 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Shield className="w-10 h-10 text-cyan-400" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              信用卡欺诈检测系统
            </h1>
            <p className="text-xs text-slate-400 font-mono tracking-wider">
              实时交易监控中心
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-slate-300">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-xs font-mono">每秒 10 笔</span>
          </div>

          <div className="flex items-center gap-2">
            {isConnected ? (
              <Wifi className="w-5 h-5 text-green-400" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-400 animate-pulse" />
            )}
            <span className={`text-xs font-mono ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? '已连接' : '重连中...'}
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-300">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-mono tabular-nums">
              {currentTime.toLocaleTimeString('en-US', { hour12: false })}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-2 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
    </header>
  );
}
