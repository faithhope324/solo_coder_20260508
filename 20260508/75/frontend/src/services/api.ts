import axios from 'axios';
import type { AnalyzeRequest, AnalyzeResponse, PDFParseResponse } from '@/types';

const api = axios.create({
  baseURL: '/api',
  timeout: 300000,
});

export const uploadPDF = async (file: File): Promise<PDFParseResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const analyzeText = async (request: AnalyzeRequest): Promise<AnalyzeResponse> => {
  const response = await api.post('/analyze', request);
  return response.data;
};

export const summarizeText = async (
  text: string,
  models: ('bart' | 't5')[],
  length: 'short' | 'medium' | 'long' = 'medium'
): Promise<AnalyzeResponse> => {
  const response = await api.post('/summarize', {
    text,
    models,
    summaryLength: length,
  });
  return response.data;
};

export const extractKeywords = async (
  text: string,
  algorithm: 'rake' | 'tfidf' = 'rake',
  maxKeywords: number = 20
): Promise<AnalyzeResponse> => {
  const response = await api.post('/keywords', {
    text,
    algorithm,
    maxKeywords,
  });
  return response.data;
};

export default api;
