import React from 'react';
import { Layers, Settings, BarChart3 } from 'lucide-react';

interface TabProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Tabs: React.FC<TabProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'geometry', label: '几何属性', icon: <Layers size={16} /> },
    { id: 'solver', label: '求解设置', icon: <Settings size={16} /> },
    { id: 'results', label: '结果分析', icon: <BarChart3 size={16} /> },
  ];
  
  return (
    <div className="flex border-b border-slate-700 bg-slate-800/50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all duration-200 ${
            activeTab === tab.id
              ? 'text-blue-400 border-b-2 border-blue-500 bg-slate-800'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
