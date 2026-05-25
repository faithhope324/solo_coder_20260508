import React from 'react';
import { Language, Settings, Eye } from 'lucide-react';
import { ProcessOptions, Language as LanguageType } from '../types';

interface OptionsPanelProps {
  options: ProcessOptions;
  onOptionsChange: (options: ProcessOptions) => void;
  sourceLanguages: LanguageType[];
  targetLanguages: LanguageType[];
  disabled?: boolean;
}

export const OptionsPanel: React.FC<OptionsPanelProps> = ({
  options,
  onOptionsChange,
  sourceLanguages,
  targetLanguages,
  disabled,
}) => {
  const handleChange = <K extends keyof ProcessOptions>(
    key: K,
    value: ProcessOptions[K]
  ) => {
    onOptionsChange({ ...options, [key]: value });
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <Settings className="w-5 h-5" />
        处理选项
      </h3>
      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Language className="w-4 h-4" />
            源语言
          </label>
          <select
            value={options.source_lang}
            onChange={(e) => handleChange('source_lang', e.target.value)}
            disabled={disabled}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {sourceLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            <Language className="w-4 h-4" />
            目标语言
          </label>
          <select
            value={options.target_lang}
            onChange={(e) => handleChange('target_lang', e.target.value)}
            disabled={disabled}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            {targetLanguages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
            重叠区域合并阈值: {(options.iou_threshold * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={options.iou_threshold}
            onChange={(e) => handleChange('iou_threshold', parseFloat(e.target.value))}
            disabled={disabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>严格</span>
            <span>宽松</span>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
            <Eye className="w-4 h-4" />
            显示选项
          </label>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.draw_bboxes}
                onChange={(e) => handleChange('draw_bboxes', e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">绘制文字边框</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={options.draw_translations}
                onChange={(e) => handleChange('draw_translations', e.target.checked)}
                disabled={disabled}
                className="w-4 h-4 text-blue-500 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">绘制翻译文字</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
