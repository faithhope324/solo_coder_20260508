import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: React.ReactNode;
  color: 'cyan' | 'amber' | 'rose' | 'emerald';
}

const colorClasses: Record<NonNullable<KPICardProps['color']>, string> = {
  cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/30',
  amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
  rose: 'from-rose-500/20 to-rose-500/5 border-rose-500/30',
  emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
};

const iconColorClasses: Record<NonNullable<KPICardProps['color']>, string> = {
  cyan: 'text-cyan-400',
  amber: 'text-amber-400',
  rose: 'text-rose-400',
  emerald: 'text-emerald-400',
};

export function KPICard({
  title,
  value,
  unit,
  trend,
  trendValue,
  icon,
  color,
}: KPICardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 backdrop-blur-sm',
        'transition-all duration-300 hover:scale-[1.02] hover:shadow-lg',
        colorClasses[color]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm text-slate-400">{title}</p>
          <div className="flex items-baseline gap-1">
            <span
              className={cn(
                'font-mono text-3xl font-bold tracking-tight',
                iconColorClasses[color]
              )}
            >
              {value}
            </span>
            {unit && <span className="text-sm text-slate-500">{unit}</span>}
          </div>
          {trend && (
            <div className="flex items-center gap-1 text-xs">
              {trend === 'up' && <TrendingUp className="h-3 w-3 text-emerald-400" />}
              {trend === 'down' && <TrendingDown className="h-3 w-3 text-rose-400" />}
              {trend === 'neutral' && <Minus className="h-3 w-3 text-slate-400" />}
              <span
                className={
                  trend === 'up'
                    ? 'text-emerald-400'
                    : trend === 'down'
                      ? 'text-rose-400'
                      : 'text-slate-400'
                }
              >
                {trendValue}
              </span>
            </div>
          )}
        </div>
        <div className={cn('rounded-lg bg-slate-900/50 p-3', iconColorClasses[color])}>
          {icon}
        </div>
      </div>
    </div>
  );
}
