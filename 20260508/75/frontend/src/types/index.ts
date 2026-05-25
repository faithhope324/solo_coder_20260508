export interface KeywordPosition {
  start: number;
  end: number;
}

export interface Keyword {
  word: string;
  weight: number;
  positions: KeywordPosition[];
}

export interface SummaryResult {
  model: string;
  summary: string;
  processingTime: number;
}

export interface AnalyzeRequest {
  text?: string;
  summaryModels: ('bart' | 't5')[];
  keywordAlgorithm: 'rake' | 'tfidf';
  summaryLength?: 'short' | 'medium' | 'long';
  maxKeywords?: number;
}

export interface AnalyzeResponse {
  success: boolean;
  originalText: string;
  summaries: SummaryResult[];
  keywords: Keyword[];
  algorithm: string;
  totalProcessingTime: number;
}

export interface PDFParseResponse {
  success: boolean;
  text: string;
  pageCount: number;
  fileName: string;
}

export type SummaryModel = 'bart' | 't5';
export type KeywordAlgorithm = 'rake' | 'tfidf';
export type SummaryLength = 'short' | 'medium' | 'long';

export interface AppState {
  originalText: string;
  isAnalyzing: boolean;
  summaries: SummaryResult[];
  keywords: Keyword[];
  selectedKeyword: string | null;
  activeSummaryTab: string;
  selectedModels: SummaryModel[];
  selectedAlgorithm: KeywordAlgorithm;
  summaryLength: SummaryLength;
  maxKeywords: number;
  fileName: string | null;
  error: string | null;
}
