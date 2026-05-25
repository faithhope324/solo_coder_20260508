import { useAppStore } from '@/store';
import { Settings, Zap, BrainCircuit, Hash, Clock, SlidersHorizontal } from 'lucide-react';
import type { SummaryModel, KeywordAlgorithm, SummaryLength } from '@/types';

const MODEL_INFO: Record<SummaryModel, { name: string; description: string }> = {
  bart: {
    name: 'BART',
    description: '双向自回归转换器，适合生成流畅的摘要',
  },
  t5: {
    name: 'T5',
    description: '文本到文本转换器，支持多种NLP任务',
  },
};

const ALGORITHM_INFO: Record<KeywordAlgorithm, { name: string; description: string }> = {
  rake: {
    name: 'RAKE',
    description: '快速关键词提取，基于词共现统计',
  },
  tfidf: {
    name: 'TF-IDF',
    description: '词频-逆文档频率，适合有语料库的场景',
  },
};

const LENGTH_OPTIONS: { value: SummaryLength; label: string; desc: string }[] = [
  { value: 'short', label: '简短', desc: '约原文10%' },
  { value: 'medium', label: '中等', desc: '约原文20%' },
  { value: 'long', label: '详细', desc: '约原文30%' },
];

function ModelSelector() {
  const {
    selectedModels,
    selectedAlgorithm,
    summaryLength,
    maxKeywords,
    toggleModel,
    setAlgorithm,
    setSummaryLength,
    setMaxKeywords,
  } = useAppStore();

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="w-5 h-5 text-accent-400" />
        <h2 className="text-xl font-display font-semibold text-white">分析设置</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BrainCircuit className="w-4 h-4 text-primary-400" />
            <label className="text-sm font-medium text-slate-300">摘要模型</label>
          </div>
          <div className="space-y-2">
            {(['bart', 't5'] as SummaryModel[]).map((model) => (
              <button
                key={model}
                onClick={() => toggleModel(model)}
                className={`
                  w-full p-3 rounded-lg text-left transition-all duration-300
                  border ${selectedModels.includes(model)
                    ? 'border-accent-500 bg-accent-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-medium ${selectedModels.includes(model) ? 'text-accent-400' : 'text-slate-200'}`}>
                    {MODEL_INFO[model].name}
                  </span>
                  <div className={`
                    w-4 h-4 rounded-full border-2 flex items-center justify-center
                    ${selectedModels.includes(model) ? 'border-accent-400' : 'border-slate-600'}
                  `}>
                    {selectedModels.includes(model) && (
                      <div className="w-2 h-2 rounded-full bg-accent-400" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">{MODEL_INFO[model].description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-primary-400" />
            <label className="text-sm font-medium text-slate-300">关键词算法</label>
          </div>
          <div className="space-y-2">
            {(['rake', 'tfidf'] as KeywordAlgorithm[]).map((algo) => (
              <button
                key={algo}
                onClick={() => setAlgorithm(algo)}
                className={`
                  w-full p-3 rounded-lg text-left transition-all duration-300
                  border ${selectedAlgorithm === algo
                    ? 'border-accent-500 bg-accent-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-medium ${selectedAlgorithm === algo ? 'text-accent-400' : 'text-slate-200'}`}>
                    {ALGORITHM_INFO[algo].name}
                  </span>
                  <div className={`
                    w-4 h-4 rounded-full border-2 flex items-center justify-center
                    ${selectedAlgorithm === algo ? 'border-accent-400' : 'border-slate-600'}
                  `}>
                    {selectedAlgorithm === algo && (
                      <div className="w-2 h-2 rounded-full bg-accent-400" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">{ALGORITHM_INFO[algo].description}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-primary-400" />
            <label className="text-sm font-medium text-slate-300">摘要长度</label>
          </div>
          <div className="space-y-2">
            {LENGTH_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setSummaryLength(option.value)}
                className={`
                  w-full p-3 rounded-lg text-left transition-all duration-300
                  border ${summaryLength === option.value
                    ? 'border-accent-500 bg-accent-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-medium ${summaryLength === option.value ? 'text-accent-400' : 'text-slate-200'}`}>
                    {option.label}
                  </span>
                  <div className={`
                    w-4 h-4 rounded-full border-2 flex items-center justify-center
                    ${summaryLength === option.value ? 'border-accent-400' : 'border-slate-600'}
                  `}>
                    {summaryLength === option.value && (
                      <div className="w-2 h-2 rounded-full bg-accent-400" />
                    )}
                  </div>
                </div>
                <p className="text-xs text-slate-500">{option.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <SlidersHorizontal className="w-4 h-4 text-primary-400" />
            <label className="text-sm font-medium text-slate-300">
              关键词数量: {maxKeywords}
            </label>
          </div>
          <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
            <input
              type="range"
              min="5"
              max="50"
              value={maxKeywords}
              onChange={(e) => setMaxKeywords(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-accent-500"
            />
            <div className="flex justify-between mt-2 text-xs text-slate-500">
              <span>5</span>
              <span>25</span>
              <span>50</span>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <Zap className="w-3 h-3" />
            <span>选择的模型越多，处理时间越长</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModelSelector;
