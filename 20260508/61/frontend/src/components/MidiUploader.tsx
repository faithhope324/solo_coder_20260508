import { useState, useCallback, useRef } from 'react';
import { Upload, FileUp, X, CheckCircle } from 'lucide-react';
import { readMidiFile } from '@/services/api';

// MIDI 上传组件属性接口
interface MidiUploaderProps {
  // MIDI 数据（base64 格式）
  midiData: string | null;
  // 已上传的文件名
  fileName: string | null;
  // MIDI 上传成功回调，接收 base64 数据和文件名
  onMidiUpload: (data: string, name: string) => void;
  // 清除已上传 MIDI 的回调
  onMidiClear: () => void;
}

// MIDI 上传组件
function MidiUploader({ midiData, fileName, onMidiUpload, onMidiClear }: MidiUploaderProps) {
  // 文件输入框引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 拖拽状态：是否有文件拖拽到区域上方
  const [isDragging, setIsDragging] = useState(false);
  // 处理中状态：是否正在读取和处理文件
  const [isProcessing, setIsProcessing] = useState(false);
  // 错误信息
  const [error, setError] = useState<string | null>(null);
  // 文件大小（用于显示）
  const [fileSize, setFileSize] = useState<number>(0);

  /**
   * 格式化文件大小为可读字符串
   * @param bytes 文件字节数
   * @returns 格式化后的文件大小字符串
   */
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  /**
   * 验证文件是否符合要求
   * @param file 待验证的文件
   * @returns 验证通过返回 true，否则返回 false
   */
  const validateFile = useCallback((file: File): boolean => {
    // 验证文件类型
    const validExtensions = ['.mid', '.midi'];
    const fileExtension = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
    if (!validExtensions.includes(fileExtension)) {
      setError('请上传 .mid 或 .midi 格式的文件');
      return false;
    }

    // 验证文件大小（最大 10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('文件大小不能超过 10MB');
      return false;
    }

    // 验证通过，清除错误信息
    setError(null);
    return true;
  }, []);

  /**
   * 处理文件选择
   * @param file 用户选择的文件
   */
  const handleFileSelect = useCallback(async (file: File) => {
    // 验证文件
    if (!validateFile(file)) {
      return;
    }

    setIsProcessing(true);

    try {
      // 读取文件内容为 base64
      const base64Data = await readMidiFile(file);
      // 保存文件大小用于显示
      setFileSize(file.size);
      // 调用上传回调
      onMidiUpload(base64Data, file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取 MIDI 文件失败，请重试');
    } finally {
      setIsProcessing(false);
    }
  }, [validateFile, onMidiUpload]);

  /**
   * 处理文件输入框变化事件
   * @param e 输入框变化事件
   */
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    // 重置输入框，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFileSelect]);

  /**
   * 处理拖拽进入事件
   * @param e 拖拽事件
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  /**
   * 处理拖拽离开事件
   * @param e 拖拽事件
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 检查是否真的离开了上传区域（而不是进入子元素）
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  /**
   * 处理拖拽悬停事件
   * @param e 拖拽事件
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 允许放置
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  /**
   * 处理文件放置事件
   * @param e 拖拽事件
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  /**
   * 处理上传区域点击事件
   */
  const handleClick = useCallback(() => {
    if (!isProcessing && !midiData) {
      fileInputRef.current?.click();
    }
  }, [isProcessing, midiData]);

  /**
   * 处理清除文件操作
   */
  const handleClear = useCallback(() => {
    onMidiClear();
    setFileSize(0);
    setError(null);
    // 重置文件输入框
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onMidiClear]);

  return (
    <div className="w-full animate-fade-in">
      {/* 隐藏的文件输入框 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".mid,.midi"
        onChange={handleInputChange}
        className="hidden"
      />

      {/* 已上传文件显示区域 */}
      {midiData && fileName ? (
        <div
          className="
            flex items-center justify-between p-4 rounded-xl
            bg-white/5 backdrop-blur-md
            border border-emerald-500/40
            shadow-lg shadow-emerald-500/10
            animate-scale-in
          "
        >
          <div className="flex items-center gap-3">
            {/* 成功状态图标 */}
            <div
              className="
                w-12 h-12 rounded-xl
                bg-emerald-500/20
                flex items-center justify-center
                animate-pulse
              "
            >
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
            {/* 文件信息 */}
            <div>
              <p className="font-medium text-emerald-300 text-base">
                {fileName}
              </p>
              <p className="text-sm text-emerald-400/70 mt-0.5">
                {formatFileSize(fileSize)}
              </p>
            </div>
          </div>
          {/* 删除按钮 */}
          <button
            onClick={handleClear}
            className="
              p-2.5 rounded-xl
              bg-white/5 hover:bg-emerald-500/20
              text-emerald-400 hover:text-emerald-300
              transition-all duration-300
              hover:scale-110
            "
            title="删除文件"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      ) : (
        /* 上传区域 */
        <div
          onClick={handleClick}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`
            relative p-8 rounded-2xl
            cursor-pointer
            transition-all duration-500 ease-out
            bg-white/5 backdrop-blur-md
            border-2
            ${isDragging
              ? 'border-solid border-purple-500 bg-purple-500/15 shadow-lg shadow-purple-500/30 scale-[1.02]'
              : 'border-dashed border-slate-600/50 hover:border-purple-500/60 hover:bg-white/8 hover:shadow-lg hover:shadow-purple-500/10'
            }
            ${isProcessing ? 'cursor-wait opacity-80' : ''}
          `}
        >
          {isProcessing ? (
            /* 处理中状态 */
            <div className="flex flex-col items-center gap-3">
              <Upload
                className="
                  w-12 h-12 text-purple-400
                  animate-bounce
                "
              />
              <p className="text-purple-300 font-medium text-lg">
                正在处理文件...
              </p>
            </div>
          ) : (
            /* 上传提示 */
            <div className="flex flex-col items-center gap-3 text-center">
              {/* 图标容器 */}
              <div
                className={`
                  w-20 h-20 rounded-2xl
                  flex items-center justify-center
                  transition-all duration-500
                  ${isDragging
                    ? 'bg-purple-500/30 scale-110'
                    : 'bg-purple-500/15 group-hover:bg-purple-500/25'
                  }
                `}
              >
                <FileUp
                  className={`
                    w-10 h-10
                    transition-all duration-300
                    ${isDragging ? 'text-purple-300 scale-110' : 'text-purple-400'}
                  `}
                />
              </div>

              {/* 文字提示 */}
              <div className="space-y-1">
                <p className="text-lg font-medium text-slate-200">
                  {isDragging ? '释放文件以上传' : '拖拽 MIDI 文件到这里'}
                </p>
                <p className="text-sm text-slate-400">
                  或点击选择文件
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  支持 .mid、.midi 格式，最大 10MB
                </p>
              </div>

              {/* 装饰性上传图标 */}
              <div className="absolute bottom-4 right-4 opacity-30">
                <Upload className="w-5 h-5 text-slate-500" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div
          className="
            mt-3 p-3 rounded-xl
            bg-red-500/10 border border-red-500/30
            text-red-300 text-sm
            animate-fadeIn
          "
        >
          {error}
        </div>
      )}
    </div>
  );
}

export default MidiUploader;
