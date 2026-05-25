import React, { useState } from 'react';
import { Play, Pause, UserPlus, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface ControlPanelProps {
  isRunning: boolean;
  participantCount: number;
  onStart: (participantCount: number, volatility: number) => void;
  onStop: () => void;
  onAddParticipants: (count: number) => void;
  onVolatilityChange: (level: number) => void;
  volatility: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  isRunning,
  participantCount,
  onStart,
  onStop,
  onAddParticipants,
  onVolatilityChange,
  volatility
}) => {
  const [count, setCount] = useState(5);
  const [showAdd, setShowAdd] = useState(false);

  return (
    <div className="bg-space-800/80 backdrop-blur-sm rounded-xl border border-space-600 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="w-5 h-5 text-neon-cyan" />
        <h3 className="font-semibold text-white">模拟控制面板</h3>
      </div>

      <div className="space-y-4">
        <div className="flex gap-3">
          {!isRunning ? (
            <>
              <div className="flex-1">
                <label className="block text-xs text-gray-400 mb-1">参会人数</label>
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={count}
                  onChange={(e) => setCount(Math.max(1, Math.min(15, parseInt(e.target.value) || 1)))}
                  className="w-full bg-space-900 border border-space-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-neon-cyan"
                />
              </div>
              <button
                onClick={() => onStart(count, volatility)}
                className="flex items-center gap-2 px-6 py-2 bg-status-good hover:bg-status-good/90 text-white font-medium rounded-lg transition-all hover:shadow-glow-green self-end"
              >
                <Play className="w-4 h-4" />
                开始
              </button>
            </>
          ) : (
            <button
              onClick={onStop}
              className="flex items-center gap-2 px-6 py-2 bg-status-critical hover:bg-status-critical/90 text-white font-medium rounded-lg transition-all hover:shadow-glow-red w-full justify-center"
            >
              <Pause className="w-4 h-4" />
              停止模拟
            </button>
          )}
        </div>

        {isRunning && (
          <>
            <div className="pt-3 border-t border-space-700">
              <label className="block text-xs text-gray-400 mb-2">
                网络波动强度: <span className="text-neon-cyan font-mono">{(volatility * 100).toFixed(0)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volatility}
                onChange={(e) => onVolatilityChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-space-700 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>稳定</span>
                <span>中等</span>
                <span>不稳定</span>
              </div>
            </div>

            <div className="pt-3 border-t border-space-700">
              <button
                onClick={() => setShowAdd(!showAdd)}
                className={cn(
                  "flex items-center gap-2 w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                  showAdd 
                    ? "bg-neon-purple/20 text-neon-purple" 
                    : "bg-space-700 text-gray-300 hover:bg-space-600"
                )}
              >
                <UserPlus className="w-4 h-4" />
                添加参会者
              </button>

              {showAdd && (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => onAddParticipants(1)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-space-700 hover:bg-space-600 text-gray-300 rounded-lg text-sm transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    +1 人
                  </button>
                  <button
                    onClick={() => onAddParticipants(3)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-space-700 hover:bg-space-600 text-gray-300 rounded-lg text-sm transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    +3 人
                  </button>
                  <button
                    onClick={() => onAddParticipants(5)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-space-700 hover:bg-space-600 text-gray-300 rounded-lg text-sm transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    +5 人
                  </button>
                </div>
              )}
            </div>

            <div className="bg-space-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">当前参会人数</span>
                <span className="font-mono font-bold text-neon-cyan">{participantCount}</span>
              </div>
            </div>
          </>
        )}

        {!isRunning && (
          <div className="pt-3 border-t border-space-700">
            <label className="block text-xs text-gray-400 mb-2">
              初始网络波动: <span className="text-neon-cyan font-mono">{(volatility * 100).toFixed(0)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volatility}
              onChange={(e) => onVolatilityChange(parseFloat(e.target.value))}
              className="w-full h-2 bg-space-700 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel;
