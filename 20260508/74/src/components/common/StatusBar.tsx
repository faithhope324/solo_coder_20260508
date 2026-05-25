import React from 'react';
import { Activity, Cpu, Zap, Grid3X3, MousePointer2 } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';

const StatusBar: React.FC = () => {
  const {
    isSolving,
    result,
    shapes,
    activeTool,
    viewTransform,
    solverConfig,
  } = useSimulationStore();
  
  const formatCoords = (x: number, y: number) => {
    return `(${x.toFixed(2)}, ${y.toFixed(2)}) m`;
  };
  
  const toolLabels: Record<string, string> = {
    select: '选择',
    rectangle: '矩形',
    circle: '圆形',
    polygon: '多边形',
    pan: '平移',
    zoom: '缩放',
    delete: '删除',
  };
  
  return (
    <div className="h-8 bg-slate-900 border-t border-slate-700 flex items-center justify-between px-4 text-xs text-slate-400 font-mono">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Activity
            size={14}
            className={isSolving ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}
          />
          <span className={isSolving ? 'text-emerald-400' : ''}>
            {isSolving ? '求解中...' : result ? '就绪' : '空闲'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <MousePointer2 size={14} />
          <span>{toolLabels[activeTool] || activeTool}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Cpu size={14} />
          <span>{shapes.length} 个对象</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Zap size={14} />
          <span>{shapes.filter(s => s.isElectrode).length} 个电极</span>
        </div>
        
        {result && (
          <>
            <div className="flex items-center gap-2">
              <Grid3X3 size={14} />
              <span>
                {result.meshStats.nodeCount} 节点 / {result.meshStats.elementCount} 单元
              </span>
            </div>
            <div className="text-emerald-400">
              {result.solveTime.toFixed(0)} 毫秒
            </div>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-6">
        <div>
          计算域: {solverConfig.domainSize.width} × {solverConfig.domainSize.height} m
        </div>
        <div>
          缩放: {(viewTransform.scale).toFixed(0)}%
        </div>
        <div>
          偏移: ({viewTransform.offsetX.toFixed(0)}, {viewTransform.offsetY.toFixed(0)}) px
        </div>
      </div>
    </div>
  );
};

export default StatusBar;
