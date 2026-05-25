import React from 'react';
import { Play, Settings, AlertCircle } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';

const SolverPanel: React.FC = () => {
  const {
    solverConfig,
    setSolverConfig,
    isSolving,
    solveError,
    shapes,
    boundaryConditions,
    setIsSolving,
    setResult,
    setSolveError,
    result,
  } = useSimulationStore();
  
  const handleSolve = async () => {
    if (isSolving) return;
    
    setIsSolving(true);
    setSolveError(null);
    
    try {
      const response = await fetch('/api/simulation/solve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          shapes,
          boundaryConditions,
          config: solverConfig,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setResult(data.data);
      } else {
        setSolveError(data.error || '求解失败');
      }
    } catch (error) {
      setSolveError(error instanceof Error ? error.message : '网络错误');
    } finally {
      setIsSolving(false);
    }
  };
  
  const handleMeshDensityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= 30) {
      setSolverConfig({ meshDensity: value });
    }
  };
  
  const handleDomainWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setSolverConfig({
        domainSize: { ...solverConfig.domainSize, width: value }
      });
    }
  };
  
  const handleDomainHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setSolverConfig({
        domainSize: { ...solverConfig.domainSize, height: value }
      });
    }
  };
  
  const handleBoundaryPotentialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      useSimulationStore.getState().boundaryConditions[0].value = value;
    }
  };
  
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 text-blue-400 mb-4">
        <Settings size={18} />
        <h3 className="font-semibold text-sm">求解器配置</h3>
      </div>
      
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          计算域宽度 (m)
        </label>
        <input
          type="number"
          value={solverConfig.domainSize.width}
          onChange={handleDomainWidthChange}
          step="1"
          min="1"
          max="100"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          计算域高度 (m)
        </label>
        <input
          type="number"
          value={solverConfig.domainSize.height}
          onChange={handleDomainHeightChange}
          step="1"
          min="1"
          max="100"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
        />
      </div>
      
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">
          网格密度: {solverConfig.meshDensity}
        </label>
        <input
          type="range"
          value={solverConfig.meshDensity}
          onChange={handleMeshDensityChange}
          min="1"
          max="30"
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
        />
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>粗糙</span>
          <span>精细</span>
        </div>
      </div>
      
      <div className="pt-2 border-t border-slate-700">
        <label className="block text-xs font-medium text-slate-400 mb-1">
          默认边界电势 (V)
        </label>
        <input
          type="number"
          value={boundaryConditions[0]?.value || 0}
          onChange={handleBoundaryPotentialChange}
          step="1"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
        />
        <p className="text-xs text-slate-500 mt-1">
          应用于外边界
        </p>
      </div>
      
      {solveError && (
        <div className="flex items-start gap-2 p-3 bg-red-950/50 border border-red-800 rounded-lg">
          <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-300">{solveError}</p>
        </div>
      )}
      
      <button
        onClick={handleSolve}
        disabled={isSolving}
        className={`w-full py-3 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 transition-all duration-200 ${
          isSolving
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20'
        }`}
      >
        {isSolving ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            求解中...
          </>
        ) : (
          <>
            <Play size={18} />
            开始仿真计算
          </>
        )}
      </button>
      
      {result && (
        <div className="mt-4 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
          <h4 className="text-sm font-medium text-slate-300 mb-2">上次计算结果</h4>
          <div className="space-y-1 text-xs text-slate-400 font-mono">
            <div className="flex justify-between">
              <span>节点数:</span>
              <span className="text-slate-200">{result.meshStats.nodeCount}</span>
            </div>
            <div className="flex justify-between">
              <span>单元数:</span>
              <span className="text-slate-200">{result.meshStats.elementCount}</span>
            </div>
            <div className="flex justify-between">
              <span>求解时间:</span>
              <span className="text-slate-200">{result.solveTime.toFixed(1)} 毫秒</span>
            </div>
          </div>
        </div>
      )}
      
      <div className="pt-2 text-xs text-slate-500">
        <p>对象总数: {shapes.length}</p>
        <p>电极数量: {shapes.filter(s => s.isElectrode).length}</p>
      </div>
    </div>
  );
};

export default SolverPanel;
