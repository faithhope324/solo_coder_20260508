import { useState, useCallback, useRef } from 'react';
import { Upload, FileWarning, CheckCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '@/store';

interface PDFUploadProps {
  onFileUpload: (file: File) => Promise<void>;
}

function PDFUpload({ onFileUpload }: PDFUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { isAnalyzing, setError } = useAppStore();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateAndUpload = useCallback(async (file: File) => {
    if (file.type !== 'application/pdf') {
      setError('请上传PDF格式的文件');
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('文件大小不能超过50MB');
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
      return;
    }

    setUploadStatus('uploading');
    try {
      await onFileUpload(file);
      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 3000);
    } catch (err) {
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  }, [onFileUpload, setError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndUpload(files[0]);
    }
  }, [validateAndUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndUpload(files[0]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [validateAndUpload]);

  const handleClick = () => {
    if (!isAnalyzing && uploadStatus !== 'uploading') {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Upload className="w-5 h-5 text-accent-400" />
        <h2 className="text-xl font-display font-semibold text-white">PDF 上传</h2>
      </div>

      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-300 min-h-[280px] flex flex-col items-center justify-center
          ${isDragging 
            ? 'border-accent-400 bg-accent-500/10' 
            : 'border-slate-600 hover:border-slate-500 bg-slate-800/30'
          }
          ${isAnalyzing || uploadStatus === 'uploading' ? 'cursor-not-allowed opacity-60' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />

        {uploadStatus === 'uploading' || isAnalyzing ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-12 h-12 text-accent-400 animate-spin" />
            <p className="text-slate-300 font-medium">正在解析 PDF...</p>
            <p className="text-slate-500 text-sm">请稍候，这可能需要几秒钟</p>
          </div>
        ) : uploadStatus === 'success' ? (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <CheckCircle className="w-12 h-12 text-green-400" />
            <p className="text-green-300 font-medium">PDF 解析成功！</p>
            <p className="text-slate-500 text-sm">正在自动开始分析...</p>
          </div>
        ) : uploadStatus === 'error' ? (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <FileWarning className="w-12 h-12 text-red-400" />
            <p className="text-red-300 font-medium">解析失败</p>
            <p className="text-slate-500 text-sm">请检查文件是否有效后重试</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className={`
              p-4 rounded-full transition-all duration-300
              ${isDragging ? 'bg-accent-500/20' : 'bg-slate-700/50'}
            `}>
              <Upload className={`w-10 h-10 transition-colors duration-300 ${isDragging ? 'text-accent-400' : 'text-slate-400'}`} />
            </div>
            <div>
              <p className="text-slate-200 font-medium mb-1">
                拖拽 PDF 文件到此处，或点击上传
              </p>
              <p className="text-slate-500 text-sm">
                支持 PDF 格式，最大 50MB
              </p>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
              <span>✓ 自动提取文本内容</span>
              <span>✓ 保留段落结构</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PDFUpload;
