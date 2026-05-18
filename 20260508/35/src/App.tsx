import { useEffect } from 'react';
import { Globe2 } from 'lucide-react';
import { MapView } from './components/Map/MapView';
import { StatusBar } from './components/StatusBar/StatusBar';
import { RefreshControl } from './components/RefreshControl/RefreshControl';
import { DetailPanel } from './components/DetailPanel/DetailPanel';
import { useNodeStore } from './store/nodeStore';

function App() {
  const { autoRefresh, refreshInterval, refreshData } = useNodeStore();

  useEffect(() => {
    if (!autoRefresh) return;

    const timer = setInterval(() => {
      refreshData();
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [autoRefresh, refreshInterval, refreshData]);

  return (
    <div className="h-full w-full flex flex-col bg-dark-900">
      <header className="flex-shrink-0 border-b border-dark-700 bg-dark-900/95 backdrop-blur-md z-20">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-xl">
                <Globe2 className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-white">CDN 节点监控</h1>
                <p className="text-xs text-gray-400">全球节点实时状态监控系统</p>
              </div>
            </div>
            <RefreshControl />
          </div>
        </div>
        <div className="px-4 py-2 border-t border-dark-700/50 overflow-x-auto">
          <StatusBar />
        </div>
      </header>

      <main className="flex-1 relative overflow-hidden">
        <MapView />
      </main>

      <DetailPanel />
    </div>
  );
}

export default App;
