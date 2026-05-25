import React, { useState, useEffect } from 'react';
import { Users, Gauge as GaugeIcon, Clock, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface OverviewCardsProps {
  participantCount: number;
  averageQuality: number;
  startTime: number | null;
  isConnected: boolean;
}

const AnimatedNumber: React.FC<{ value: number; suffix?: string; className?: string }> = ({ 
  value, 
  suffix = '', 
  className 
}) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const start = display;
    const diff = value - start;
    const duration = 500;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * easeOut));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className={className}>{display}{suffix}</span>
  );
};

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}:${String(minutes % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
};

export const OverviewCards: React.FC<OverviewCardsProps> = ({
  participantCount,
  averageQuality,
  startTime,
  isConnected
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startTime) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const qualityColor = 
    averageQuality >= 80 ? 'text-status-good' :
    averageQuality >= 50 ? 'text-status-warning' :
    'text-status-critical';

  const qualityBg = 
    averageQuality >= 80 ? 'bg-status-good/10' :
    averageQuality >= 50 ? 'bg-status-warning/10' :
    'bg-status-critical/10';

  const cards = [
    {
      icon: Users,
      label: '参会人数',
      value: participantCount,
      suffix: ' 人',
      color: 'text-neon-cyan',
      bg: 'bg-neon-cyan/10',
      iconColor: 'text-neon-cyan'
    },
    {
      icon: GaugeIcon,
      label: '平均质量分',
      value: averageQuality,
      suffix: '',
      color: qualityColor,
      bg: qualityBg,
      iconColor: qualityColor
    },
    {
      icon: Clock,
      label: '运行时长',
      value: null,
      customDisplay: startTime ? formatDuration(elapsed) : '--:--',
      color: 'text-neon-purple',
      bg: 'bg-neon-purple/10',
      iconColor: 'text-neon-purple'
    },
    {
      icon: Activity,
      label: '连接状态',
      value: null,
      customDisplay: isConnected ? '已连接' : '未连接',
      color: isConnected ? 'text-status-good' : 'text-gray-400',
      bg: isConnected ? 'bg-status-good/10' : 'bg-gray-500/10',
      iconColor: isConnected ? 'text-status-good' : 'text-gray-400',
      pulse: isConnected
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className={cn(
            'relative bg-space-800/80 backdrop-blur-sm rounded-xl border border-space-600 p-4',
            'transition-all duration-300 hover:border-space-500',
            card.bg
          )}
        >
          <div className="flex items-start justify-between">
            <div className={cn('p-2 rounded-lg', card.bg)}>
              <card.icon className={cn('w-5 h-5', card.iconColor, card.pulse && 'animate-pulse')} />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xs text-gray-400 mb-1">{card.label}</p>
            <p className={cn('font-display font-bold text-2xl', card.color)}>
              {card.value !== null ? (
                <AnimatedNumber value={card.value} suffix={card.suffix} />
              ) : (
                <span className="font-mono">{card.customDisplay}</span>
              )}
            </p>
          </div>
          {card.pulse && (
            <div className="absolute top-3 right-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-good opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-status-good" />
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default OverviewCards;
