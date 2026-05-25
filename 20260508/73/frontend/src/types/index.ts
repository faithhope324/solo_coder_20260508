export interface TextRegion {
  id: number;
  bbox: [number, number, number, number];
  polygon: number[][];
  original_text: string;
  translated_text: string;
  confidence: number;
  center: { x: number; y: number };
  size: { width: number; height: number };
  merged_count: number;
}

export interface OCRResult {
  image_size: { width: number; height: number };
  region_count: number;
  regions: TextRegion[];
  annotated_image: string;
  comparison_image: string;
  original_image: string;
}

export interface Language {
  code: string;
  name: string;
}

export interface LanguagesResponse {
  source_languages: Language[];
  target_languages: Language[];
}

export interface ProcessOptions {
  target_lang: string;
  source_lang: string;
  iou_threshold: number;
  draw_bboxes: boolean;
  draw_translations: boolean;
}

export interface TranslationResult {
  original: string;
  translated: string;
  source_lang: string;
  target_lang: string;
}
