import axios from 'axios';
import type { OCRResult, LanguagesResponse, ProcessOptions, TranslationResult } from '../types';

const API_BASE_URL = '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000,
});

export const healthCheck = async (): Promise<{ status: string; message: string }> => {
  const response = await api.get('/health');
  return response.data;
};

export const getLanguages = async (): Promise<LanguagesResponse> => {
  const response = await api.get('/languages');
  return response.data;
};

export const processImage = async (
  file: File,
  options: ProcessOptions
): Promise<OCRResult> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('target_lang', options.target_lang);
  formData.append('source_lang', options.source_lang);
  formData.append('iou_threshold', options.iou_threshold.toString());
  formData.append('draw_bboxes', options.draw_bboxes.toString());
  formData.append('draw_translations', options.draw_translations.toString());

  const response = await api.post('/process', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const translateText = async (
  text: string,
  sourceLang: string = 'auto',
  targetLang: string = 'en'
): Promise<TranslationResult> => {
  const formData = new FormData();
  formData.append('text', text);
  formData.append('source_lang', sourceLang);
  formData.append('target_lang', targetLang);

  const response = await api.post('/translate', formData);
  return response.data;
};

export const downloadAnnotatedImage = async (
  file: File,
  options: ProcessOptions & { format: string }
): Promise<Blob> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('target_lang', options.target_lang);
  formData.append('source_lang', options.source_lang);
  formData.append('iou_threshold', options.iou_threshold.toString());
  formData.append('draw_bboxes', options.draw_bboxes.toString());
  formData.append('draw_translations', options.draw_translations.toString());
  formData.append('format', options.format);

  const response = await api.post('/download_annotated', formData, {
    responseType: 'blob',
  });
  return response.data;
};
