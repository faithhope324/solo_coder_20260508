import React, { useState } from 'react';
import { Zap } from 'lucide-react';
import Toolbar from '../components/toolbar/Toolbar';
import GeometryCanvas from '../components/canvas/GeometryCanvas';
import ResultCanvas from '../components/canvas/ResultCanvas';
import PropertyPanel from '../components/panels/PropertyPanel';
import SolverPanel from '../components/panels/SolverPanel';
import ResultPanel from '../components/panels/ResultPanel';
import ComponentLibrary from '../components/panels/ComponentLibrary';
import Tabs from '../components/common/Tabs';
import StatusBar from '../components/common/StatusBar';
import { useSimulationStore } from '../store/useSimulationStore';

const SimulationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('geometry');
  const { result, selectedShapeId } = useSimulationStore();
  
  const renderRightPanelContent = () => {
    switch (activeTab) {
      case 'geometry':
        return selectedShapeId ? <PropertyPanel /> : (
          <div className="p-4 text-center text-slate-400">
            <p className="text-sm">选择一个对象以编辑其属性</p>
            <p className="text-xs text-slate-500 mt-2">或从左侧元件库拖拽元件到画布</p>
          </div>
        );
      case 'solver':
        return <SolverPanel />;
      case 'results':
        return <ResultPanel />;
      default:
        return null;
    }
  };
  
  return (
    <div className="h-screen flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
      <header className="h-12 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Zap size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider" style={{ fontFamily: "'Orbitron', sans-serif" }}>
              电磁场有限元仿真系统
            </h1>
            <p className="text-xs text-slate-500">Electromagnetic Field FEM Analysis</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-xs text-slate-500">
            <span className="text-emerald-400">●</span> 后端服务已连接
          </div>
        </div>
      </header>
      
      <Toolbar />
      
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-56 bg-slate-800 border-r border-slate-700 flex flex-col overflow-hidden">
          <ComponentLibrary />
        </aside>
        
        <div className="flex-1 relative">
          {result ? <ResultCanvas /> : <GeometryCanvas />}
        </div>
        
        <aside className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col overflow-hidden">
          <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
          <div className="flex-1 overflow-y-auto">
            {renderRightPanelContent()}
          </div>
        </aside>
      </div>
      
      <StatusBar />
    </div>
  );
};

export default SimulationPage;
