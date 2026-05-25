import React from 'react';
import {
  MousePointer2,
  Square,
  Circle,
  Pentagon,
  Trash2,
  Play,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileDown,
  Zap,
} from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { ToolType } from '../../types';

const Toolbar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    shapes,
    isSolving,
    viewTransform,
    setViewTransform,
    resetView,
    clearAll,
    result,
    boundaryConditions,
    solverConfig,
    setIsSolving,
    setResult,
    setSolveError,
  } = useSimulationStore();
  
  const tools: { id: ToolType; icon: React.ReactNode; label: string }[] = [
    { id: 'select', icon: <MousePointer2 size={20} />, label: '选择工具' },
    { id: 'rectangle', icon: <Square size={20} />, label: '绘制矩形' },
    { id: 'circle', icon: <Circle size={20} />, label: '绘制圆形' },
    { id: 'polygon', icon: <Pentagon size={20} />, label: '绘制多边形' },
    { id: 'delete', icon: <Trash2 size={20} />, label: '删除对象' },
  ];
  
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
  
  const handleZoomIn = () => {
    setViewTransform({ scale: Math.min(200, viewTransform.scale * 1.2) });
  };
  
  const handleZoomOut = () => {
    setViewTransform({ scale: Math.max(10, viewTransform.scale / 1.2) });
  };
  
  return (
    <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-2">
      <div className="flex items-center gap-1">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id)}
            className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200 group relative ${
              activeTool === tool.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
            title={tool.label}
          >
            {tool.icon}
            <span className="absolute top-full mt-1 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              {tool.label}
            </span>
          </button>
        ))}
      </div>
      
      <div className="w-px h-8 bg-slate-700 mx-2" />
      
      <button
        onClick={handleSolve}
        disabled={isSolving}
        className={`px-4 h-10 flex items-center gap-2 rounded-lg transition-all duration-200 group relative ${
          isSolving
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/30'
        }`}
        title="开始仿真"
      >
        {isSolving ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <Play size={18} />
        )}
        <span className="text-sm font-medium">
          {isSolving ? '求解中...' : '开始仿真'}
        </span>
      </button>
      
      <button
        onClick={handleExportReport}
        disabled={!result}
        className={`px-4 h-10 flex items-center gap-2 rounded-lg transition-all duration-200 group relative ${
          !result
            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
            : 'bg-amber-600 text-white hover:bg-amber-500 shadow-lg shadow-amber-600/30'
        }`}
        title="导出报告"
      >
        <FileDown size={18} />
        <span className="text-sm font-medium">导出报告</span>
      </button>
      
      <div className="flex-1" />
      
      <button
        onClick={handleZoomIn}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all duration-200 group relative"
        title="放大"
      >
        <ZoomIn size={18} />
        <span className="absolute top-full mt-1 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          放大视图
        </span>
      </button>
      
      <button
        onClick={handleZoomOut}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all duration-200 group relative"
        title="缩小"
      >
        <ZoomOut size={18} />
        <span className="absolute top-full mt-1 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          缩小视图
        </span>
      </button>
      
      <button
        onClick={resetView}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all duration-200 group relative"
        title="重置视图"
      >
        <RotateCcw size={18} />
        <span className="absolute top-full mt-1 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          重置视图
        </span>
      </button>
      
      <div className="w-px h-8 bg-slate-700 mx-2" />
      
      <button
        onClick={clearAll}
        className="w-10 h-10 flex items-center justify-center rounded-lg text-slate-400 hover:bg-red-600 hover:text-white transition-all duration-200 group relative"
        title="清空所有"
      >
        <Zap size={18} />
        <span className="absolute top-full mt-1 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
          清空所有对象
        </span>
      </button>
    </div>
  );
};

export default Toolbar;
