import { create } from 'zustand';
import type { AppState, SummaryResult, Keyword, SummaryModel, KeywordAlgorithm, SummaryLength } from '@/types';

export const useAppStore = create<AppState & {
  setOriginalText: (text: string) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setSummaries: (summaries: SummaryResult[]) => void;
  setKeywords: (keywords: Keyword[]) => void;
  setSelectedKeyword: (keyword: string | null) => void;
  setActiveSummaryTab: (tab: string) => void;
  toggleModel: (model: SummaryModel) => void;
  setAlgorithm: (algorithm: KeywordAlgorithm) => void;
  setSummaryLength: (length: SummaryLength) => void;
  setMaxKeywords: (count: number) => void;
  setFileName: (name: string | null) => void;
  setError: (error: string | null) => void;
  resetResults: () => void;
}>((set, get) => ({
  originalText: '',
  isAnalyzing: false,
  summaries: [],
  keywords: [],
  selectedKeyword: null,
  activeSummaryTab: 'bart',
  selectedModels: ['bart', 't5'],
  selectedAlgorithm: 'rake',
  summaryLength: 'medium',
  maxKeywords: 20,
  fileName: null,
  error: null,

  setOriginalText: (text) => set({ originalText: text }),
  setAnalyzing: (isAnalyzing) => set({ isAnalyzing }),
  setSummaries: (summaries) => {
    if (summaries.length > 0 && !get().activeSummaryTab) {
      set({ activeSummaryTab: summaries[0].model });
    }
    set({ summaries });
  },
  setKeywords: (keywords) => set({ keywords }),
  setSelectedKeyword: (keyword) => set({ selectedKeyword: keyword }),
  setActiveSummaryTab: (tab) => set({ activeSummaryTab: tab }),
  toggleModel: (model) => {
    const current = get().selectedModels;
    if (current.includes(model)) {
      if (current.length > 1) {
        set({ selectedModels: current.filter(m => m !== model) });
      }
    } else {
      set({ selectedModels: [...current, model] });
    }
  },
  setAlgorithm: (algorithm) => set({ selectedAlgorithm: algorithm }),
  setSummaryLength: (length) => set({ summaryLength: length }),
  setMaxKeywords: (count) => set({ maxKeywords: count }),
  setFileName: (name) => set({ fileName: name }),
  setError: (error) => set({ error }),
  resetResults: () => set({
    summaries: [],
    keywords: [],
    selectedKeyword: null,
    error: null,
  }),
}));
