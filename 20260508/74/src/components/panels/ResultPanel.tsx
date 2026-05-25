import React from 'react';
import { BarChart3, FileDown } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { getPotentialStats, formatScientific } from '../../utils/visualization';

const ResultPanel: React.FC = () => {
  const {
    result,
    visualization,
    setVisualization,
    shapes,
    boundaryConditions,
    solverConfig,
  } = useSimulationStore();
  
  const handleExportReport = async () => {
    if (!result) return;
    
    try {
      const response = await fetch('/api/simulation/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          simulation: {
            shapes,
            boundaryConditions,
            config: solverConfig,
          },
          result,
          title: '电磁场有限元仿真报告',
        }),
      });
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = '电磁场仿真报告.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出错误:', error);
    }
  };
  
  if (!result) {
    return (
      <div className="p-4 text-slate-400 text-center">
        <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">运行仿真以查看结果</p>
      </div>
    );
  }
  
  const stats = getPotentialStats(result);
  
  return (
    <div className="p-4 space-y-4 overflow-y-auto max-h-full">
      <div className="flex items-center gap-2 text-emerald-400 mb-4">
        <BarChart3 size={18} />
        <h3 className="font-semibold text-sm">仿真结果</h3>
      </div>
      
      <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg space-y-2">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          电势分布 (V)
        </h4>
        <div className="space-y-1 text-sm font-mono">
          <div className="flex justify-between">
            <span className="text-slate-400">最小值:</span>
            <span className="text-blue-400">{formatScientific(stats.minV, 4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">最大值:</span>
            <span className="text-red-400">{formatScientific(stats.maxV, 4)}</span>
          </div>
        </div>
      </div>
      
      <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg space-y-2">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          电场强度 (V/m)
        </h4>
        <div className="space-y-1 text-sm font-mono">
          <div className="flex justify-between">
            <span className="text-slate-400">最大值:</span>
            <span className="text-amber-400">{formatScientific(stats.maxE, 4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">平均值:</span>
            <span className="text-slate-200">{formatScientific(stats.avgE, 4)}</span>
          </div>
        </div>
      </div>
      
      <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg space-y-2">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
          网格统计
        </h4>
        <div className="space-y-1 text-sm font-mono">
          <div className="flex justify-between">
            <span className="text-slate-400">节点数:</span>
            <span className="text-slate-200">{result.meshStats.nodeCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">单元数:</span>
            <span className="text-slate-200">{result.meshStats.elementCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">求解时间:</span>
            <span className="text-emerald-400">{result.solveTime.toFixed(1)} 毫秒</span>
          </div>
        </div>
      </div>
      
      <div className="pt-2 border-t border-slate-700">
        <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
          可视化选项
        </h4>
        
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={visualization.showGrid}
              onChange={(e) => setVisualization({ showGrid: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-300">显示网格</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={visualization.showContours}
              onChange={(e) => setVisualization({ showContours: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-300">显示电势等高线</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={visualization.showVectors}
              onChange={(e) => setVisualization({ showVectors: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-300">显示电场矢量</span>
          </label>
        </div>
      </div>
      
      {visualization.showContours && (
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            等高线级数: {visualization.contourLevels}
          </label>
          <input
            type="range"
            value={visualization.contourLevels}
            onChange={(e) => setVisualization({ contourLevels: parseInt(e.target.value) })}
            min="5"
            max="30"
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      )}
      
      {visualization.showVectors && (
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            矢量缩放: {visualization.vectorScale.toFixed(3)}
          </label>
          <input
            type="range"
            value={visualization.vectorScale * 1000}
            onChange={(e) => setVisualization({ vectorScale: parseInt(e.target.value) / 1000 })}
            min="1"
            max="100"
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      )}
      
      <div className="pt-4">
        <button
          onClick={handleExportReport}
          className="w-full py-2.5 px-4 bg-amber-600 text-white rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:bg-amber-500 transition-colors shadow-lg shadow-amber-600/20"
        >
          <FileDown size={16} />
          导出PDF报告
        </button>
      </div>
    </div>
  );
};

export default ResultPanel;
