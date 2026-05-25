import React from 'react';
import { Square, Circle, Hexagon, Zap, Layers, Wind, Droplets, Palette } from 'lucide-react';
import { useSimulationStore } from '../../store/useSimulationStore';
import { DEFAULT_MATERIALS } from '../../types';

interface ComponentItem {
  type: 'rectangle' | 'circle' | 'polygon';
  name: string;
  icon: React.ReactNode;
  defaultName: string;
}

interface MaterialItem {
  key: string;
  name: string;
  icon: React.ReactNode;
}

const ComponentLibrary: React.FC = () => {
  const { setActiveTool, setPendingDropMaterial } = useSimulationStore();

  const shapes: ComponentItem[] = [
    { type: 'rectangle', name: '矩形', icon: <Square size={24} />, defaultName: '矩形' },
    { type: 'circle', name: '圆形', icon: <Circle size={24} />, defaultName: '圆形' },
    { type: 'polygon', name: '多边形', icon: <Hexagon size={24} />, defaultName: '多边形' },
  ];

  const materials: MaterialItem[] = [
    { key: 'copper', name: '铜 (电极)', icon: <Zap size={20} /> },
    { key: 'aluminum', name: '铝', icon: <Zap size={20} /> },
    { key: 'silicon', name: '硅', icon: <Palette size={20} /> },
    { key: 'glass', name: '玻璃', icon: <Layers size={20} /> },
    { key: 'teflon', name: '特氟龙', icon: <Palette size={20} /> },
    { key: 'water', name: '水', icon: <Droplets size={20} /> },
    { key: 'air', name: '空气', icon: <Wind size={20} /> },
  ];

  const handleDragStart = (
    e: React.DragEvent,
    type: 'rectangle' | 'circle' | 'polygon',
    defaultName: string,
    materialKey?: string
  ) => {
    e.dataTransfer.setData('shapeType', type);
    e.dataTransfer.setData('defaultName', defaultName);
    e.dataTransfer.setData('isElectrode', materialKey === 'copper' ? 'true' : 'false');
    if (materialKey) {
      e.dataTransfer.setData('materialKey', materialKey);
      setPendingDropMaterial(DEFAULT_MATERIALS[materialKey]);
    }
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragStartMaterial = (e: React.DragEvent, materialKey: string) => {
    e.dataTransfer.setData('materialKey', materialKey);
    e.dataTransfer.setData('isElectrode', materialKey === 'copper' ? 'true' : 'false');
    setPendingDropMaterial(DEFAULT_MATERIALS[materialKey]);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleToolClick = (type: 'rectangle' | 'circle' | 'polygon') => {
    setActiveTool(type);
  };

  return (
    <div className="h-full flex flex-col bg-slate-800">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
          <Square size={16} />
          元件库
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            基本几何
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {shapes.map((shape) => (
              <div
                key={shape.type}
                draggable
                onDragStart={(e) => handleDragStart(e, shape.type, shape.defaultName)}
                onClick={() => handleToolClick(shape.type)}
                className="flex flex-col items-center gap-2 p-3 bg-slate-700/50 hover:bg-slate-700 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200 border border-transparent hover:border-blue-500/50 group"
              >
                <div className="text-blue-400 group-hover:scale-110 transition-transform">
                  {shape.icon}
                </div>
                <span className="text-xs text-slate-300">{shape.name}</span>
                <span className="text-[10px] text-slate-500">拖拽或点击</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            电极
          </h3>
          <div className="space-y-2">
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, 'rectangle', '电极板', 'copper')}
              className="flex items-center gap-3 p-3 bg-amber-900/30 hover:bg-amber-900/50 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200 border border-amber-700/30 hover:border-amber-500/50 group"
            >
              <div className="w-10 h-10 rounded bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Zap size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-amber-300 font-medium">矩形电极</p>
                <p className="text-[10px] text-amber-500">铜 · 导体</p>
              </div>
            </div>

            <div
              draggable
              onDragStart={(e) => handleDragStart(e, 'circle', '圆形电极', 'copper')}
              className="flex items-center gap-3 p-3 bg-amber-900/30 hover:bg-amber-900/50 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200 border border-amber-700/30 hover:border-amber-500/50 group"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
                <Zap size={20} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-amber-300 font-medium">圆形电极</p>
                <p className="text-[10px] text-amber-500">铜 · 导体</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
            介质材料
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {materials.filter(m => m.key !== 'copper').map((material) => (
              <div
                key={material.key}
                draggable
                onDragStart={(e) => handleDragStartMaterial(e, material.key)}
                className="flex flex-col items-center gap-1.5 p-2.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200 border border-transparent hover:border-emerald-500/50 group"
              >
                <div className="text-emerald-400 group-hover:scale-110 transition-transform">
                  {material.icon}
                </div>
                <span className="text-[11px] text-slate-300 text-center leading-tight">
                  {material.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-slate-700 bg-slate-800/50">
        <p className="text-[10px] text-slate-500 text-center">
          拖拽元件到画布中创建
        </p>
      </div>
    </div>
  );
};

export default ComponentLibrary;
