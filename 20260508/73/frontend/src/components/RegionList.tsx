import React from 'react';
import { TextRegion } from '../types';
import { FileText, Layers } from 'lucide-react';

interface RegionListProps {
  regions: TextRegion[];
}

const getConfidenceColor = (confidence: number): string => {
  if (confidence >= 0.9) return 'bg-green-500';
  if (confidence >= 0.7) return 'bg-yellow-500';
  return 'bg-red-500';
};

export const RegionList: React.FC<RegionListProps> = ({ regions }) => {
  if (regions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
        <p>未检测到文字区域</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Layers className="w-5 h-5" />
          文字区域 ({regions.length})
        </h3>
      </div>
      <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
        {regions.map((region, index) => (
          <div
            key={region.id}
            className="region-card bg-white rounded-lg p-4 border border-gray-200"
          >
            <div className="flex items-start justify-between mb-2">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-medium">
                {index + 1}
              </span>
              {region.merged_count > 1 && (
                <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
                  合并 {region.merged_count} 个区域
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-xs text-gray-500 mb-1">原文</p>
                <p className="text-gray-800 font-medium">{region.original_text}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">译文</p>
                <p className="text-blue-600 font-medium">{region.translated_text}</p>
              </div>
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">置信度</span>
                  <span className="text-xs font-medium text-gray-700">
                    {(region.confidence * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="confidence-bar">
                  <div
                    className={`confidence-fill ${getConfidenceColor(region.confidence)}`}
                    style={{ width: `${region.confidence * 100}%` }}
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-2 border-t border-gray-100">
                <div className="text-xs text-gray-500">
                  位置: ({Math.round(region.bbox[0])}, {Math.round(region.bbox[1])})
                </div>
                <div className="text-xs text-gray-500">
                  大小: {Math.round(region.size.width)} × {Math.round(region.size.height)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
