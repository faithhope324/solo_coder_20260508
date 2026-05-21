import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Repeat,
  SkipBack,
  Download,
  Music,
  FileAudio,
} from 'lucide-react';
import { downloadBase64File } from '@/services/api';

// 播放控制组件属性接口
interface PlaybackControlsProps {
  // 是否正在播放
  isPlaying: boolean;
  // 当前播放时间（秒）
  currentTime: number;
  // 总时长（秒）
  duration: number;
  // 音量（0-1）
  volume: number;
  // 是否循环播放
  isLooping: boolean;
  // MIDI 文件 Base64 数据
  midiData: string | null;
  // MP3 文件 Base64 数据
  mp3Data: string | null;
  // 任务ID
  taskId: string | null;
  // 播放/暂停切换回调
  onPlayPause: () => void;
  // 进度跳转回调
  onSeek: (time: number) => void;
  // 音量变化回调
  onVolumeChange: (volume: number) => void;
  // 静音切换回调
  onToggleMute: () => void;
  // 循环播放切换回调
  onToggleLoop: () => void;
  // 重新开始回调
  onRestart: () => void;
}

// 播放控制组件
function PlaybackControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isLooping,
  midiData,
  mp3Data,
  taskId,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleLoop,
  onRestart,
}: PlaybackControlsProps) {
  // Audio 元素引用
  const audioRef = useRef<HTMLAudioElement>(null);
  // 进度条拖拽状态
  const [isDragging, setIsDragging] = useState(false);
  // 拖拽时的临时时间
  const [dragTime, setDragTime] = useState(0);
  // 是否静音
  const [isMuted, setIsMuted] = useState(false);
  // 进度条元素引用
  const progressRef = useRef<HTMLDivElement>(null);

  // 格式化时间（秒 -> MM:SS）
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // 计算播放进度百分比
  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;
  // 拖拽时显示的进度百分比
  const displayPercentage = isDragging
    ? duration > 0
      ? (dragTime / duration) * 100
      : 0
    : progressPercentage;

  // 处理播放/暂停状态变化
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(() => {
        // 自动播放失败时静默处理
      });
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // 处理音量变化
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = isMuted ? 0 : volume;
  }, [volume, isMuted]);

  // 处理循环播放状态变化
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.loop = isLooping;
  }, [isLooping]);

  // 处理当前时间同步（非拖拽状态下）
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || isDragging) return;

    // 当时间差超过 0.5 秒时才同步，避免频繁设置
    if (Math.abs(audio.currentTime - currentTime) > 0.5) {
      audio.currentTime = currentTime;
    }
  }, [currentTime, isDragging]);

  // 处理时长变化
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // 如果有 MP3 数据，设置音频源
    if (mp3Data) {
      try {
        const binaryString = window.atob(mp3Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        audio.src = url;

        // 清理旧的 URL
        return () => {
          URL.revokeObjectURL(url);
        };
      } catch {
        // Base64 解码失败时静默处理
      }
    }
  }, [mp3Data]);

  // 根据鼠标位置计算时间
  const getTimeFromPosition = useCallback(
    (clientX: number): number => {
      if (!progressRef.current || duration <= 0) return 0;

      const rect = progressRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      return percentage * duration;
    },
    [duration]
  );

  // 处理进度条鼠标按下事件
  const handleProgressMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
      const time = getTimeFromPosition(e.clientX);
      setDragTime(time);
    },
    [getTimeFromPosition]
  );

  // 处理鼠标移动事件（全局）
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const time = getTimeFromPosition(e.clientX);
      setDragTime(time);
    },
    [isDragging, getTimeFromPosition]
  );

  // 处理鼠标释放事件（全局）
  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      onSeek(dragTime);
      setIsDragging(false);
    }
  }, [isDragging, dragTime, onSeek]);

  // 监听全局鼠标事件（用于拖拽）
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // 处理音频 timeupdate 事件
  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || isDragging) return;

    onSeek(audio.currentTime);
  }, [isDragging, onSeek]);

  // 处理音频播放结束事件
  const handleEnded = useCallback(() => {
    if (!isLooping) {
      onPlayPause();
    }
  }, [isLooping, onPlayPause]);

  // 处理静音切换
  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    onToggleMute();
  }, [onToggleMute]);

  // 处理音量滑块变化
  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = Number(e.target.value);
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
      }
      onVolumeChange(newVolume);
    },
    [isMuted, onVolumeChange]
  );

  // 处理下载 MIDI
  const handleDownloadMidi = useCallback(() => {
    if (!midiData || !taskId) return;

    downloadBase64File(midiData, `${taskId}.mid`, 'audio/midi');
  }, [midiData, taskId]);

  // 处理下载 MP3
  const handleDownloadMp3 = useCallback(() => {
    if (!mp3Data || !taskId) return;

    downloadBase64File(mp3Data, `${taskId}.mp3`, 'audio/mpeg');
  }, [mp3Data, taskId]);

  // 处理进度条点击（非拖拽时）
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isDragging) return;

      const time = getTimeFromPosition(e.clientX);
      onSeek(time);
    },
    [isDragging, getTimeFromPosition, onSeek]
  );

  return (
    <>
      {/* 隐藏的 HTML5 Audio 元素 */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        className="hidden"
      />

      {/* 玻璃拟态底部控制栏 */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 py-4 md:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="relative backdrop-blur-xl bg-slate-900/70 border border-slate-700/50 rounded-2xl shadow-2xl shadow-black/30 overflow-hidden">
            {/* 背景装饰渐变 */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-cyan-500/5 to-pink-500/5 pointer-events-none" />

            {/* 顶部发光边线 */}
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

            <div className="relative p-4 md:p-6 space-y-4">
              {/* 进度条区域 */}
              <div className="flex items-center gap-4">
                {/* 当前时间显示 */}
                <span className="text-sm font-mono text-slate-300 w-16 text-right select-none">
                  {formatTime(isDragging ? dragTime : currentTime)}
                </span>

                {/* 进度条容器 */}
                <div
                  ref={progressRef}
                  className="flex-1 h-2 bg-slate-800/80 rounded-full cursor-pointer group relative"
                  onClick={handleProgressClick}
                  onMouseDown={handleProgressMouseDown}
                >
                  {/* 渐变填充进度 */}
                  <div
                    className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-500 rounded-full transition-all duration-100"
                    style={{ width: `${displayPercentage}%` }}
                  />

                  {/* 进度条拖拽点 */}
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg shadow-purple-500/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
                    style={{ left: `calc(${displayPercentage}% - 8px)` }}
                  />

                  {/* 悬停时的发光效果 */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/0 via-purple-500/20 to-cyan-500/0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* 总时长显示 */}
                <span className="text-sm font-mono text-slate-400 w-16 select-none">
                  {formatTime(duration)}
                </span>
              </div>

              {/* 控制按钮区域 */}
              <div className="flex items-center justify-between">
                {/* 左侧：重新开始按钮 */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={onRestart}
                    disabled={duration === 0}
                    className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed group"
                    title="重新开始"
                  >
                    <SkipBack className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all" />
                  </button>

                  <button
                    onClick={onToggleLoop}
                    disabled={duration === 0}
                    className={`p-2 rounded-full transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed group ${
                      isLooping
                        ? 'text-purple-400 bg-purple-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                    }`}
                    title={isLooping ? '取消循环' : '循环播放'}
                  >
                    <Repeat
                      className={`w-5 h-5 transition-all ${
                        isLooping
                          ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]'
                          : 'group-hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]'
                      }`}
                    />
                  </button>
                </div>

                {/* 中间：播放/暂停按钮 */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={onPlayPause}
                    disabled={duration === 0}
                    className="relative p-4 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 group"
                    title={isPlaying ? '暂停' : '播放'}
                  >
                    {/* 按钮发光效果 */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-200" />

                    <div className="relative">
                      {isPlaying ? (
                        <Pause className="w-7 h-7" />
                      ) : (
                        <Play className="w-7 h-7 ml-0.5" />
                      )}
                    </div>
                  </button>
                </div>

                {/* 右侧：音量控制和下载按钮 */}
                <div className="flex items-center gap-3">
                  {/* 音量控制 */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleToggleMute}
                      disabled={duration === 0}
                      className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700/50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed group"
                      title={isMuted || volume === 0 ? '取消静音' : '静音'}
                    >
                      {isMuted || volume === 0 ? (
                        <VolumeX className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-all" />
                      ) : (
                        <Volume2 className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-all" />
                      )}
                    </button>

                    {/* 音量滑块 */}
                    <div className="relative group/volume">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-20 h-2 appearance-none bg-transparent cursor-pointer relative z-10"
                        style={{
                          background: `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(236, 72, 153) ${
                            (isMuted ? 0 : volume) * 100
                          }%, rgb(51, 65, 85) ${(isMuted ? 0 : volume) * 100}%, rgb(51, 65, 85) 100%)`,
                        }}
                      />
                      {/* 滑块轨道自定义样式 */}
                      <style>{`
                        input[type="range"]::-webkit-slider-thumb {
                          -webkit-appearance: none;
                          appearance: none;
                          width: 14px;
                          height: 14px;
                          border-radius: 50%;
                          background: white;
                          cursor: pointer;
                          box-shadow: 0 0 8px rgba(168, 85, 247, 0.5);
                          transition: all 0.2s;
                        }
                        input[type="range"]::-webkit-slider-thumb:hover {
                          box-shadow: 0 0 12px rgba(168, 85, 247, 0.8);
                          transform: scale(1.1);
                        }
                        input[type="range"]::-moz-range-thumb {
                          width: 14px;
                          height: 14px;
                          border-radius: 50%;
                          background: white;
                          cursor: pointer;
                          border: none;
                          box-shadow: 0 0 8px rgba(168, 85, 247, 0.5);
                          transition: all 0.2s;
                        }
                        input[type="range"]::-moz-range-thumb:hover {
                          box-shadow: 0 0 12px rgba(168, 85, 247, 0.8);
                          transform: scale(1.1);
                        }
                        input[type="range"]:disabled {
                          opacity: 0.4;
                          cursor: not-allowed;
                        }
                      `}</style>
                    </div>

                    <span className="text-xs text-slate-500 w-8 select-none">
                      {Math.round((isMuted ? 0 : volume) * 100)}%
                    </span>
                  </div>

                  {/* 分隔线 */}
                  <div className="w-px h-6 bg-slate-700/50" />

                  {/* 下载按钮 */}
                  <button
                    onClick={handleDownloadMidi}
                    disabled={!midiData || !taskId}
                    className="p-2 rounded-full text-slate-400 hover:text-purple-400 hover:bg-slate-700/50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed group"
                    title="下载 MIDI"
                  >
                    <div className="flex items-center gap-1">
                      <FileAudio className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-all" />
                      <Download className="w-3 h-3 -mt-3" />
                    </div>
                  </button>

                  <button
                    onClick={handleDownloadMp3}
                    disabled={!mp3Data || !taskId}
                    className="p-2 rounded-full text-slate-400 hover:text-cyan-400 hover:bg-slate-700/50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed group"
                    title="下载 MP3"
                  >
                    <div className="flex items-center gap-1">
                      <Music className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(6,182,212,0.5)] transition-all" />
                      <Download className="w-3 h-3 -mt-3" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default PlaybackControls;
