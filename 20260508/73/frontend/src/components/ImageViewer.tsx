import React, { useState } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Download, ArrowLeftRight } from 'lucide-react';

interface ImageViewerProps {
  originalImage: string;
  annotatedImage: string;
  comparisonImage: string;
}

type ViewMode = 'original' | 'annotated' | 'comparison' | 'split';

export const ImageViewer: React.FC<ImageViewerProps> = ({
  originalImage,
  annotatedImage,
  comparisonImage,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 25));
  const handleResetZoom = () => setZoom(100);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${annotatedImage}`;
    link.download = 'annotated_image.png';
    link.click();
  };

  const viewModes: { key: ViewMode; label: string }[] = [
    { key: 'original', label: '原图' },
    { key: 'annotated', label: '标注图' },
    { key: 'comparison', label: '对比图' },
    { key: 'split', label: '并排' },
  ];

  const renderImage = (imageData: string, alt: string) => (
    <img
      src={`data:image/png;base64,${imageData}`}
      alt={alt}
      style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}
      className="transition-transform duration-200"
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {viewModes.map((mode) => (
            <button
              key={mode.key}
              onClick={() => setViewMode(mode.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                viewMode === mode.key
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomOut}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            title="缩小"
          >
            <ZoomOut className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-sm font-medium text-gray-600 w-16 text-center">
            {zoom}%
          </span>
          <button
            onClick={handleZoomIn}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            title="放大"
          >
            <ZoomIn className="w-5 h-5 text-gray-600" />
          </button>
          <button
            onClick={handleResetZoom}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            title="重置"
          >
            <Maximize2 className="w-5 h-5 text-gray-600" />
          </button>
          <div className="w-px h-6 bg-gray-300 mx-2" />
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            导出图片
          </button>
        </div>
      </div>

      <div className="image-container bg-gray-50 p-4 overflow-auto max-h-[600px]">
        {viewMode === 'original' && renderImage(originalImage, '原图')}
        {viewMode === 'annotated' && renderImage(annotatedImage, '标注图')}
        {viewMode === 'comparison' && renderImage(comparisonImage, '对比图')}
        {viewMode === 'split' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-500 mb-2 text-center">原图</div>
              {renderImage(originalImage, '原图')}
            </div>
            <div>
              <div className="text-sm text-gray-500 mb-2 text-center">标注图</div>
              {renderImage(annotatedImage, '标注图')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
