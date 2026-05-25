import { useMemo } from 'react';
import { useAppStore } from '@/store';
import { Cloud, Hash, MousePointerClick } from 'lucide-react';
import type { Keyword } from '@/types';

const COLOR_PALETTE = [
  'text-cyan-400',
  'text-blue-400',
  'text-indigo-400',
  'text-purple-400',
  'text-pink-400',
  'text-emerald-400',
  'text-teal-400',
  'text-sky-400',
  'text-violet-400',
  'text-fuchsia-400',
];

const BG_PALETTE = [
  'bg-cyan-500/20 border-cyan-500/30 hover:bg-cyan-500/30',
  'bg-blue-500/20 border-blue-500/30 hover:bg-blue-500/30',
  'bg-indigo-500/20 border-indigo-500/30 hover:bg-indigo-500/30',
  'bg-purple-500/20 border-purple-500/30 hover:bg-purple-500/30',
  'bg-pink-500/20 border-pink-500/30 hover:bg-pink-500/30',
  'bg-emerald-500/20 border-emerald-500/30 hover:bg-emerald-500/30',
  'bg-teal-500/20 border-teal-500/30 hover:bg-teal-500/30',
  'bg-sky-500/20 border-sky-500/30 hover:bg-sky-500/30',
  'bg-violet-500/20 border-violet-500/30 hover:bg-violet-500/30',
  'bg-fuchsia-500/20 border-fuchsia-500/30 hover:bg-fuchsia-500/30',
];

function KeywordCloud() {
  const { keywords, selectedKeyword, setSelectedKeyword } = useAppStore();

  const processedKeywords = useMemo(() => {
    if (keywords.length === 0) return [];

    const maxWeight = Math.max(...keywords.map(k => k.weight));
    const minWeight = Math.min(...keywords.map(k => k.weight));
    const weightRange = maxWeight - minWeight || 1;

    return keywords.map((keyword, index) => {
      const normalizedWeight = (keyword.weight - minWeight) / weightRange;
      const fontSize = 0.75 + normalizedWeight * 1.25;
      const colorIndex = index % COLOR_PALETTE.length;
      
      return {
        ...keyword,
        fontSize,
        color: COLOR_PALETTE[colorIndex],
        bgClass: BG_PALETTE[colorIndex],
      };
    });
  }, [keywords]);

  if (keywords.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Cloud className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">关键词云将在此处显示</p>
          <p className="text-slate-600 text-sm mt-1">分析完成后可点击关键词查看原文位置</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Cloud className="w-5 h-5 text-accent-400" />
          <h2 className="text-xl font-display font-semibold text-white">关键词云</h2>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <MousePointerClick className="w-3 h-3" />
          <span>点击关键词高亮原文</span>
        </div>
      </div>

      <div className="min-h-[320px] max-h-[400px] overflow-y-auto scrollbar-thin p-4 bg-slate-800/30 rounded-lg">
        <div className="flex flex-wrap gap-2 items-center justify-center">
          {processedKeywords.map((keyword, index) => (
            <button
              key={`${keyword.word}-${index}`}
              onClick={() => {
                if (selectedKeyword === keyword.word) {
                  setSelectedKeyword(null);
                } else {
                  setSelectedKeyword(keyword.word);
                }
              }}
              style={{
                fontSize: `${keyword.fontSize}rem`,
                animationDelay: `${index * 0.05}s`,
              }}
              className={`
                keyword-tag border font-medium transition-all duration-300
                ${keyword.bgClass} ${keyword.color}
                ${selectedKeyword === keyword.word 
                  ? 'ring-2 ring-accent-400 ring-offset-2 ring-offset-slate-900 scale-110' 
                  : ''
                }
                animate-fade-in
              `}
              title={`权重: ${keyword.weight.toFixed(4)} · 出现 ${keyword.positions.length} 次`}
            >
              <span className="flex items-center gap-1.5">
                {keyword.word}
                <span className="text-xs opacity-60 font-normal">
                  ({keyword.positions.length})
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <Hash className="w-3 h-3" />
          <span>共 {keywords.length} 个关键词</span>
        </div>
        {selectedKeyword && (
          <div className="flex items-center gap-2 text-accent-400">
            <span>已选择：</span>
            <span className="font-medium">{selectedKeyword}</span>
            <button
              onClick={() => setSelectedKeyword(null)}
              className="text-slate-500 hover:text-slate-300"
            >
              清除
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default KeywordCloud;
