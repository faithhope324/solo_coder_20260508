import React, { useState, useEffect, useCallback } from 'react';
import { ImageUploader } from './components/ImageUploader';
import { ImageViewer } from './components/ImageViewer';
import { RegionList } from './components/RegionList';
import { OptionsPanel } from './components/OptionsPanel';
import { processImage, getLanguages, healthCheck } from './services/api';
import type { OCRResult, ProcessOptions, Language } from './types';
import { Globe, RefreshCw, AlertCircle, CheckCircle2, FileImage } from 'lucide-react';

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBackendOnline, setIsBackendOnline] = useState<boolean | null>(null);
  const [sourceLanguages, setSourceLanguages] = useState<Language[]>([]);
  const [targetLanguages, setTargetLanguages] = useState<Language[]>([]);
  const [options, setOptions] = useState<ProcessOptions>({
    target_lang: 'en',
    source_lang: 'auto',
    iou_threshold: 0.3,
    draw_bboxes: true,
    draw_translations: true,
  });

  useEffect(() => {
    const checkBackend = async () => {
      try {
        await healthCheck();
        setIsBackendOnline(true);
        const langs = await getLanguages();
        setSourceLanguages(langs.source_languages);
        setTargetLanguages(langs.target_languages);
      } catch {
        setIsBackendOnline(false);
      }
    };
    checkBackend();
  }, []);

  const handleImageSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setResult(null);
    setError(null);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }, []);

  const handleProcess = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const data = await processImage(selectedFile, options);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
  };

  const handleOptionsChange = useCallback((newOptions: ProcessOptions) => {
    setOptions(newOptions);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">场景文字识别与翻译系统</h1>
                <p className="text-sm text-gray-500">OCR + 智能翻译 + 图片标注</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isBackendOnline !== null && (
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                    isBackendOnline
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {isBackendOnline ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      后端服务正常
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      后端服务未连接
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <OptionsPanel
              options={options}
              onOptionsChange={handleOptionsChange}
              sourceLanguages={sourceLanguages}
              targetLanguages={targetLanguages}
              disabled={isProcessing}
            />

            {selectedFile && (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <FileImage className="w-4 h-4" />
                  已选择图片
                </h3>
                <div className="space-y-3">
                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                    {previewUrl && (
                      <img
                        src={previewUrl}
                        alt="预览"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-gray-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleProcess}
                      disabled={isProcessing || !isBackendOnline}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {isProcessing ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          处理中...
                        </>
                      ) : (
                        <>开始处理</>
                      )}
                    </button>
                    <button
                      onClick={handleReset}
                      disabled={isProcessing}
                      className="px-4 py-2.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      重置
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 space-y-6">
            {!selectedFile ? (
              <ImageUploader
                onImageSelect={handleImageSelect}
                disabled={isProcessing || !isBackendOnline}
              />
            ) : result ? (
              <>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <ImageViewer
                    originalImage={result.original_image}
                    annotatedImage={result.annotated_image}
                    comparisonImage={result.comparison_image}
                  />
                </div>
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="text-sm">
                        <span className="text-gray-500">图片尺寸：</span>
                        <span className="font-medium text-gray-700">
                          {result.image_size.width} × {result.image_size.height}
                        </span>
                      </div>
                      <div className="w-px h-4 bg-gray-300" />
                      <div className="text-sm">
                        <span className="text-gray-500">检测到：</span>
                        <span className="font-medium text-blue-600">
                          {result.region_count} 个文字区域
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={handleReset}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      上传新图片
                    </button>
                  </div>
                  <RegionList regions={result.regions} />
                </div>
              </>
            ) : (
              <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
                {isProcessing ? (
                  <div className="space-y-4">
                    <div className="loading-spinner mx-auto" />
                    <p className="text-gray-600">正在处理图片，请稍候...</p>
                    <p className="text-sm text-gray-400">
                      OCR 文字检测与翻译可能需要几秒钟
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <FileImage className="w-16 h-16 mx-auto text-gray-300" />
                    <p className="text-gray-500">点击"开始处理"按钮进行文字识别与翻译</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            <p>场景文字识别与翻译系统 v1.0.0</p>
            <p className="mt-1">
              支持路牌、菜单、标识等场景图片的文字识别与多语言翻译
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
