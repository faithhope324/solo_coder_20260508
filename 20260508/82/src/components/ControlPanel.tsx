import { Atom, Info, Settings, RotateCcw } from 'lucide-react';
import useTrajectoryStore from '@/store/useTrajectoryStore';

export function ControlPanel() {
  const { meta, currentFrameData } = useTrajectoryStore();

  const handleReset = () => {
    window.location.reload();
  };

  return (
    <div className="w-[280px] h-full bg-slate-900/95 backdrop-blur-md border-r border-cyan-500/20 flex flex-col">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
            <Atom size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
              MD 可视化
            </h1>
            <p className="text-xs text-slate-500">分子动力学轨迹</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-6">
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Info size={14} className="text-cyan-400" />
            <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">模拟信息</h2>
          </div>
          
          {meta ? (
            <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
              <InfoRow label="系统名称" value={meta.systemName} highlight />
              <InfoRow label="原子数量" value={meta.atomCount.toString()} />
              <InfoRow label="总帧数" value={meta.totalFrames.toString()} />
              <InfoRow label="盒子尺寸" value={`${meta.boxSize[0]}×${meta.boxSize[1]}×${meta.boxSize[2]} Å`} />
              <InfoRow label="时间步长" value={`${meta.timestep.toFixed(3)} ps`} />
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-lg p-4 text-center">
              <div className="animate-pulse text-slate-500 text-sm">加载中...</div>
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center gap-2 mb-3">
            <Settings size={14} className="text-purple-400" />
            <h2 className="text-xs font-bold text-purple-400 uppercase tracking-wider">原子类型</h2>
          </div>
          
          {meta ? (
            <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
              {meta.atomTypes.map((type) => (
                <div key={type.id} className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full shadow-lg"
                    style={{ backgroundColor: type.color, boxShadow: `0 0 10px ${type.color}40` }}
                  />
                  <span className="text-white font-mono text-sm">{type.name}</span>
                  <span className="ml-auto text-slate-500 text-xs">r = {type.radius.toFixed(2)} Å</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
              <div className="h-6 bg-slate-700/50 rounded animate-pulse" />
              <div className="h-6 bg-slate-700/50 rounded animate-pulse" />
            </div>
          )}
        </section>

        {currentFrameData && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Atom size={14} className="text-orange-400" />
              <h2 className="text-xs font-bold text-orange-400 uppercase tracking-wider">当前状态</h2>
            </div>
            
            <div className="bg-slate-800/50 rounded-lg p-3 space-y-2">
              <InfoRow label="帧编号" value={currentFrameData.frame.toString()} highlight />
              <InfoRow label="模拟时间" value={`${currentFrameData.time.toFixed(3)} ps`} />
              <InfoRow 
                label="温度" 
                value={`${currentFrameData.temperature.toFixed(1)} K`}
                valueColor="text-orange-400"
              />
              <InfoRow 
                label="势能" 
                value={currentFrameData.potentialEnergy.toFixed(2)}
                valueColor="text-purple-400"
              />
              <InfoRow 
                label="动能" 
                value={currentFrameData.kineticEnergy.toFixed(2)}
                valueColor="text-cyan-400"
              />
              <InfoRow 
                label="总能量" 
                value={(currentFrameData.potentialEnergy + currentFrameData.kineticEnergy).toFixed(2)}
                valueColor="text-green-400"
              />
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center gap-2 mb-3">
            <RotateCcw size={14} className="text-red-400" />
            <h2 className="text-xs font-bold text-red-400 uppercase tracking-wider">操作</h2>
          </div>
          
          <button
            onClick={handleReset}
            className="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-red-500/50 text-slate-300 hover:text-red-400 transition-all text-sm flex items-center justify-center gap-2 group"
          >
            <RotateCcw size={14} className="group-hover:rotate-[-360deg] transition-transform duration-500" />
            重置模拟
          </button>
        </section>
      </div>

      <div className="p-4 border-t border-slate-800">
        <div className="text-center text-xs text-slate-600">
          <p>Molecular Dynamics Visualizer</p>
          <p className="text-slate-700">v1.0.0</p>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ 
  label, 
  value, 
  highlight = false,
  valueColor = 'text-slate-300'
}: { 
  label: string; 
  value: string; 
  highlight?: boolean;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className={`font-mono ${highlight ? 'text-cyan-400 font-bold' : valueColor}`}>{value}</span>
    </div>
  );
}

export default ControlPanel;
