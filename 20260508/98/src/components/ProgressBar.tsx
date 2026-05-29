import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

interface ProgressBarProps {
  used: number;
  quota: number;
  label: string;
  unit: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ used, quota, label, unit }) => {
  const percentage = Math.min(Math.round((used / quota) * 100), 100);
  const isOverQuota = used > quota;
  const isNearQuota = !isOverQuota && percentage >= 80;

  const barColor = isOverQuota
    ? 'bg-red-500'
    : isNearQuota
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  const bgColor = isOverQuota
    ? 'bg-red-100'
    : isNearQuota
    ? 'bg-amber-100'
    : 'bg-emerald-100';

  const textColor = isOverQuota
    ? 'text-red-700'
    : isNearQuota
    ? 'text-amber-700'
    : 'text-emerald-700';

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          {isOverQuota && (
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
          )}
        </div>
        <span className={cn('text-sm font-semibold', textColor)}>
          {used} / {quota} {unit}
        </span>
      </div>
      <div className={cn('h-2.5 rounded-full overflow-hidden', bgColor)}>
        <div
          className={cn('h-full rounded-full transition-all duration-500 ease-out', barColor)}
          style={{ width: `${isOverQuota ? 100 : percentage}%` }}
        />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className={cn('text-xs font-medium', textColor)}>
          {percentage}%
        </span>
        {isOverQuota && (
          <span className="text-xs font-medium text-red-600">超出配额 {Math.round(((used - quota) / quota) * 100)}%</span>
        )}
      </div>
    </div>
  );
};
