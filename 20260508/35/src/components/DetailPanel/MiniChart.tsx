interface MiniChartProps {
  data: number[];
  color: string;
  label: string;
  unit?: string;
}

export const MiniChart = ({ data, color, label, unit = '' }: MiniChartProps) => {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,100 ${points} 100,100`;

  const currentValue = data[data.length - 1];
  const previousValue = data[data.length - 2];
  const trend = currentValue > previousValue ? 'up' : currentValue < previousValue ? 'down' : 'stable';

  return (
    <div className="bg-dark-800/50 rounded-lg p-3 border border-dark-700/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400">{label}</span>
        <div className="flex items-center gap-1">
          <span className="text-xs font-mono text-gray-300">
            {currentValue.toFixed(1)}{unit}
          </span>
          {trend !== 'stable' && (
            <span
              className={`text-xs ${trend === 'up' ? 'text-red-400' : 'text-green-400'}`}
            >
              {trend === 'up' ? '↑' : '↓'}
            </span>
          )}
        </div>
      </div>
      <svg width="100%" height="40" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={areaPoints}
          fill={`url(#gradient-${label})`}
        />
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
