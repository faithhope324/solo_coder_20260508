import { useEffect, useState, useRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  gradient: string;
  subValue?: string;
}

export function StatsCard({ title, value, icon: Icon, gradient, subValue }: StatsCardProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(value);

  useEffect(() => {
    if (prevValueRef.current !== value) {
      setIsAnimating(true);
      setDisplayValue(value);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      prevValueRef.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <div className="relative group">
      <div className={`absolute -inset-px bg-gradient-to-r ${gradient} rounded-xl opacity-50 group-hover:opacity-80 transition-opacity blur-sm`} />
      <div className="relative bg-slate-900/90 backdrop-blur-sm rounded-xl p-5 border border-slate-700/50">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">
              {title}
            </p>
            <p
              className={`text-3xl font-bold font-mono bg-gradient-to-r ${gradient} bg-clip-text text-transparent transition-all duration-300 ${
                isAnimating ? 'scale-110' : 'scale-100'
              }`}
            >
              {displayValue}
            </p>
            {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
          </div>
          <div className={`p-3 rounded-lg bg-gradient-to-br ${gradient} opacity-20 group-hover:opacity-30 transition-opacity`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-b-xl" />
      </div>
    </div>
  );
}
