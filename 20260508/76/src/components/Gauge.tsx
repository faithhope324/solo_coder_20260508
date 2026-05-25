import React, { useMemo } from 'react';
import { cn } from '../lib/utils';

interface GaugeProps {
  value: number;
  min?: number;
  max: number;
  label: string;
  unit: string;
  warningThreshold: number;
  criticalThreshold: number;
  inverse?: boolean;
  size?: number;
  decimals?: number;
}

export const Gauge: React.FC<GaugeProps> = ({
  value,
  min = 0,
  max,
  label,
  unit,
  warningThreshold,
  criticalThreshold,
  inverse = false,
  size = 120,
  decimals = 0
}) => {
  const status = useMemo(() => {
    if (inverse) {
      if (value <= criticalThreshold) return 'critical';
      if (value <= warningThreshold) return 'warning';
      return 'good';
    } else {
      if (value >= criticalThreshold) return 'critical';
      if (value >= warningThreshold) return 'warning';
      return 'good';
    }
  }, [value, warningThreshold, criticalThreshold, inverse]);

  const colorMap = {
    good: '#10B981',
    warning: '#F59E0B',
    critical: '#EF4444'
  };

  const color = colorMap[status];

  const percentage = useMemo(() => {
    const clampedValue = Math.max(min, Math.min(max, value));
    return ((clampedValue - min) / (max - min)) * 100;
  }, [value, min, max]);

  const startAngle = -135;
  const endAngle = 135;
  const angleRange = endAngle - startAngle;

  const currentAngle = startAngle + (percentage / 100) * angleRange;

  const arcRadius = (size - 20) / 2;
  const center = size / 2;
  const strokeWidth = 8;

  const polarToCartesian = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad)
    };
  };

  const describeArc = (start: number, end: number, radius: number) => {
    const startPos = polarToCartesian(start, radius);
    const endPos = polarToCartesian(end, radius);
    const largeArcFlag = end - start <= 180 ? '0' : '1';
    return `M ${startPos.x} ${startPos.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endPos.x} ${endPos.y}`;
  };

  const displayValue = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <path
            d={describeArc(startAngle, endAngle, arcRadius)}
            fill="none"
            stroke="#1E293B"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          
          <path
            d={describeArc(startAngle, endAngle, arcRadius)}
            fill="none"
            stroke="#334155"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray="2 4"
            opacity="0.5"
          />

          <path
            d={describeArc(startAngle, currentAngle, arcRadius)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
            style={{
              filter: `drop-shadow(0 0 6px ${color}60)`
            }}
          />

          {status === 'critical' && (
            <circle
              cx={center}
              cy={center}
              r={arcRadius + 6}
              fill="none"
              stroke={color}
              strokeWidth="1"
              opacity="0.3"
              className="animate-pulse"
            />
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span 
            className={cn(
              "font-display font-bold transition-colors duration-300",
              status === 'critical' && 'animate-pulse'
            )}
            style={{ 
              color, 
              fontSize: size * 0.22 
            }}
          >
            {displayValue}
          </span>
          <span className="text-xs text-gray-400 font-mono mt-0.5">{unit}</span>
        </div>
      </div>
      <span className="text-xs text-gray-500 mt-1 font-medium tracking-wide">
        {label}
      </span>
    </div>
  );
};

export default Gauge;
