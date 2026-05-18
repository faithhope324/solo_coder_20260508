interface ProgressBarProps {
  value: number;
  max?: number;
  color: string;
  label: string;
  unit?: string;
  showValue?: boolean;
}

export const ProgressBar = ({
  value,
  max = 100,
  color,
  label,
  unit = '%',
  showValue = true,
}: ProgressBarProps) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{label}</span>
        {showValue && (
          <span className="text-xs font-mono text-gray-300">
            {value.toFixed(1)}{unit}
          </span>
        )}
      </div>
      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
    </div>
  );
};
