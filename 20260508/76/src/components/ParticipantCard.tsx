import React from 'react';
import { User, Wifi, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { Gauge } from './Gauge';
import { cn } from '../lib/utils';
import type { WebRtcMetrics } from '../../shared/types';
import { DEFAULT_THRESHOLDS } from '../../shared/types';

interface ParticipantCardProps {
  participantId: string;
  participantName: string;
  metrics: WebRtcMetrics | undefined;
  onTriggerEvent?: (participantId: string, eventType: 'congestion' | 'disruption') => void;
}

export const ParticipantCard: React.FC<ParticipantCardProps> = ({
  participantId,
  participantName,
  metrics,
  onTriggerEvent
}) => {
  const status = metrics?.status || 'good';

  const statusConfig = {
    good: {
      color: 'border-status-good',
      bg: 'bg-status-good/10',
      glow: 'shadow-glow-green',
      badge: 'bg-status-good',
      text: '正常',
      icon: CheckCircle
    },
    warning: {
      color: 'border-status-warning',
      bg: 'bg-status-warning/10',
      glow: 'shadow-glow-yellow',
      badge: 'bg-status-warning',
      text: '警告',
      icon: AlertTriangle
    },
    critical: {
      color: 'border-status-critical',
      bg: 'bg-status-critical/10',
      glow: 'shadow-glow-red',
      badge: 'bg-status-critical',
      text: '严重',
      icon: XCircle
    }
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const avatarColors = [
    'from-blue-500 to-cyan-500',
    'from-purple-500 to-pink-500',
    'from-green-500 to-emerald-500',
    'from-orange-500 to-yellow-500',
    'from-red-500 to-rose-500',
    'from-indigo-500 to-violet-500',
  ];

  const colorIndex = participantName.charCodeAt(0) % avatarColors.length;

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 bg-space-800/80 backdrop-blur-sm',
        'transition-all duration-500 ease-out overflow-hidden',
        'hover:scale-[1.02]',
        config.color,
        status === 'critical' && 'animate-pulse-slow',
        metrics && config.glow
      )}
    >
      <div className={cn('absolute top-0 left-0 right-0 h-1', config.badge)} />
      
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-12 h-12 rounded-full bg-gradient-to-br flex items-center justify-center',
              avatarColors[colorIndex]
            )}>
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">{participantName}</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  config.badge,
                  status === 'critical' && 'animate-breath'
                )} />
                <span className={cn('text-xs font-medium', 
                  status === 'good' && 'text-status-good',
                  status === 'warning' && 'text-status-warning',
                  status === 'critical' && 'text-status-critical'
                )}>
                  {config.text}
                </span>
                <StatusIcon className={cn('w-3.5 h-3.5',
                  status === 'good' && 'text-status-good',
                  status === 'warning' && 'text-status-warning',
                  status === 'critical' && 'text-status-critical'
                )} />
              </div>
            </div>
          </div>

          {metrics && (
            <div className="text-right">
              <div className="text-xs text-gray-400 font-mono">分辨率</div>
              <div className="font-mono text-neon-cyan font-bold">
                {metrics.resolution.width}×{metrics.resolution.height}
              </div>
            </div>
          )}
        </div>

        {metrics ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Gauge
                value={metrics.packetLoss}
                max={15}
                label="丢包率"
                unit="%"
                warningThreshold={DEFAULT_THRESHOLDS.packetLoss.warning}
                criticalThreshold={DEFAULT_THRESHOLDS.packetLoss.critical}
                size={100}
                decimals={2}
              />
              <Gauge
                value={metrics.latency}
                max={500}
                label="延迟"
                unit="ms"
                warningThreshold={DEFAULT_THRESHOLDS.latency.warning}
                criticalThreshold={DEFAULT_THRESHOLDS.latency.critical}
                size={100}
              />
              <Gauge
                value={metrics.jitter}
                max={150}
                label="抖动"
                unit="ms"
                warningThreshold={DEFAULT_THRESHOLDS.jitter.warning}
                criticalThreshold={DEFAULT_THRESHOLDS.jitter.critical}
                size={100}
              />
              <Gauge
                value={metrics.resolution.height}
                max={1200}
                label="分辨率高"
                unit="px"
                warningThreshold={DEFAULT_THRESHOLDS.resolution.warning}
                criticalThreshold={DEFAULT_THRESHOLDS.resolution.critical}
                inverse
                size={100}
              />
            </div>

            <div className="flex items-center justify-between bg-space-900/50 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-neon-cyan" />
                <span className="text-xs text-gray-400">码率</span>
              </div>
              <span className="font-mono font-bold text-white">
                {metrics.bitrate} <span className="text-gray-400 text-xs">kbps</span>
              </span>
            </div>
          </>
        ) : (
          <div className="h-48 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-space-600 border-t-neon-cyan rounded-full animate-spin" />
              <span className="text-gray-500 text-sm">等待数据...</span>
            </div>
          </div>
        )}
      </div>

      {onTriggerEvent && (
        <div className="border-t border-space-700 p-3 bg-space-900/30 flex gap-2">
          <button
            onClick={() => onTriggerEvent(participantId, 'congestion')}
            className="flex-1 py-1.5 px-3 text-xs font-medium rounded-md bg-status-warning/20 text-status-warning hover:bg-status-warning/30 transition-colors"
          >
            模拟拥塞
          </button>
          <button
            onClick={() => onTriggerEvent(participantId, 'disruption')}
            className="flex-1 py-1.5 px-3 text-xs font-medium rounded-md bg-status-critical/20 text-status-critical hover:bg-status-critical/30 transition-colors"
          >
            模拟中断
          </button>
        </div>
      )}
    </div>
  );
};

export default ParticipantCard;
