import { Play, RotateCcw, Loader2 } from 'lucide-react';
import { useSimulationStore } from '../store/useSimulationStore';
import { cn } from '@/lib/utils';

export function SimulationControl() {
  const { isLoading, runSimulation, reset } = useSimulationStore();

  return (
    <div className="flex gap-3">
      <button
        onClick={runSimulation}
        disabled={isLoading}
        className={cn(
          'flex flex-1 items-center justify-center gap-2 rounded-xl px-6 py-4',
          'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium',
          'transition-all duration-300 hover:from-cyan-400 hover:to-blue-500',
          'hover:shadow-lg hover:shadow-cyan-500/25',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>模拟运行中...</span>
          </>
        ) : (
          <>
            <Play className="h-5 w-5" />
            <span>运行模拟</span>
          </>
        )}
      </button>

      <button
        onClick={reset}
        disabled={isLoading}
        className={cn(
          'flex items-center justify-center gap-2 rounded-xl px-5 py-4',
          'border border-slate-700 bg-slate-800 text-slate-300',
          'transition-all duration-300 hover:border-slate-600 hover:bg-slate-700',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <RotateCcw className="h-5 w-5" />
        <span className="sr-only">重置</span>
      </button>
    </div>
  );
}
