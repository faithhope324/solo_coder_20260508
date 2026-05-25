import { useState } from 'react';
import { useAppStore } from '@/store';
import { FileText, Clock, Copy, Check, BrainCircuit } from 'lucide-react';
import type { SummaryResult } from '@/types';

interface SummaryTabsProps {
  summaries: SummaryResult[];
}

const MODEL_LABELS: Record<string, { name: string; color: string }> = {
  bart: { name: 'BART', color: 'from-blue-500 to-indigo-600' },
  t5: { name: 'T5', color: 'from-emerald-500 to-teal-600' },
};

function SummaryTabs({ summaries }: SummaryTabsProps) {
  const { activeSummaryTab, setActiveSummaryTab, originalText } = useAppStore();
  const [copiedModel, setCopiedModel] = useState<string | null>(null);

  const handleCopy = async (text: string, model: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedModel(model);
      setTimeout(() => setCopiedModel(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (summaries.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6 min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <BrainCircuit className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">摘要结果将在此处显示</p>
          <p className="text-slate-600 text-sm mt-1">请先输入文本并点击"开始分析"</p>
        </div>
      </div>
    );
  }

  const activeSummary = summaries.find(s => s.model === activeSummaryTab) || summaries[0];

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent-400" />
          <h2 className="text-xl font-display font-semibold text-white">摘要结果</h2>
        </div>
        <div className="flex items-center gap-1">
          {summaries.map((summary) => (
            <button
              key={summary.model}
              onClick={() => setActiveSummaryTab(summary.model)}
              className={`
                tab-btn flex items-center gap-2 text-sm
                ${activeSummaryTab === summary.model ? 'active' : ''}
              `}
            >
              <div className={`
                w-2 h-2 rounded-full bg-gradient-to-r
                ${MODEL_LABELS[summary.model]?.color || 'bg-slate-500'}
              `} />
              {MODEL_LABELS[summary.model]?.name || summary.model}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {summaries.map((summary) => (
          <div
            key={summary.model}
            className={`transition-all duration-300 ${
              activeSummaryTab === summary.model
                ? 'opacity-100'
                : 'hidden opacity-0'
            }`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`
                  px-3 py-1 rounded-full text-xs font-medium text-white
                  bg-gradient-to-r ${MODEL_LABELS[summary.model]?.color}
                `}>
                  {MODEL_LABELS[summary.model]?.name || summary.model}
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>{summary.processingTime.toFixed(2)}s</span>
                </div>
              </div>
              <button
                onClick={() => handleCopy(summary.summary, summary.model)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
              >
                {copiedModel === summary.model ? (
                  <>
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">已复制</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>复制</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-5 max-h-[300px] overflow-y-auto scrollbar-thin">
              <p className="text-slate-200 leading-relaxed text-sm whitespace-pre-wrap">
                {summary.summary}
              </p>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span>
                {summary.summary.length} 字符 · 
                {summary.summary.trim().split(/\s+/).length} 词
              </span>
              <span>
                压缩比: {originalText.length > 0 ? 
                  ((1 - summary.summary.length / originalText.length) * 100).toFixed(1) : '0'}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SummaryTabs;
