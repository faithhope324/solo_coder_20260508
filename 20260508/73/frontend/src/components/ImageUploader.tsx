import React, { useCallback, useState } from 'react';
import { Upload, ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelect: (file: File) => void;
  disabled?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelect, disabled }) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onImageSelect(file);
      }
    }
  }, [onImageSelect, disabled]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImageSelect(files[0]);
    }
  }, [onImageSelect]);

  return (
    <div
      className={`upload-zone rounded-xl p-12 text-center cursor-pointer transition-all ${
        isDragOver ? 'drag-over' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
      />
      <div className="flex flex-col items-center gap-4">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
          {isDragOver ? (
            <ImageIcon className="w-10 h-10 text-blue-500" />
          ) : (
            <Upload className="w-10 h-10 text-blue-500" />
          )}
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-700">
            {isDragOver ? '释放以上传图片' : '拖拽图片到此处或点击上传'}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            支持 JPG、PNG、BMP 等常见图片格式
          </p>
        </div>
      </div>
    </div>
  );
};
