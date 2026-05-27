import { useState, useCallback, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Gauge } from 'lucide-react';
import useTrajectoryStore from '@/store/useTrajectoryStore';

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 4];

export function PlaybackControls() {
  const {
    isPlaying,
    currentFrame,
    meta,
    playbackSpeed,
    currentFrameData,
    play,
    pause,
    seek,
    setSpeed,
    seekToFrame,
  } = useTrajectoryStore();
  const [isDragging, setIsDragging] = useState(false);
  const [dragFrame, setDragFrame] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);

  const totalFrames = meta?.totalFrames || 100;
  const displayFrame = isDragging ? dragFrame : currentFrame;
  const progress = totalFrames > 0 ? (displayFrame / totalFrames) * 100 : 0;

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const handleSliderMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    pause();
    updateFrameFromMouse(e.clientX);
  }, [pause]);

  const updateFrameFromMouse = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newFrame = Math.floor(percentage * (totalFrames - 1));
    setDragFrame(Math.max(0, Math.min(newFrame, totalFrames - 1)));
  }, [totalFrames]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      updateFrameFromMouse(e.clientX);
    }
  }, [isDragging, updateFrameFromMouse]);

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      seek(dragFrame);
      seekToFrame(dragFrame);
    }
  }, [isDragging, dragFrame, seek, seekToFrame]);

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

  const skipBackward = useCallback(() => {
    const newFrame = Math.max(0, currentFrame - 10);
    seek(newFrame);
    seekToFrame(newFrame);
  }, [currentFrame, seek, seekToFrame]);

  const skipForward = useCallback(() => {
    const newFrame = Math.min(totalFrames - 1, currentFrame + 10);
    seek(newFrame);
    seekToFrame(newFrame);
  }, [currentFrame, totalFrames, seek, seekToFrame]);

  const handleSpeedChange = useCallback((speed: number) => {
    setSpeed(speed);
  }, [setSpeed]);

  const formatTime = (frame: number) => {
    const timestep = meta?.timestep || 0.001;
    const time = frame * timestep;
    return `${time.toFixed(2)} ps`;
  };

  return (
    <div className="w-full px-6 py-4 bg-slate-900/90 backdrop-blur-md border-t border-cyan-500/20">
      <div className="max-w-7xl mx-auto flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="text-cyan-400 font-mono text-sm min-w-[80px] text-right">
            {formatTime(displayFrame)}
          </div>

          <div
            ref={sliderRef}
            className="flex-1 h-2 bg-slate-700 rounded-full relative cursor-pointer group"
            onMouseDown={handleSliderMouseDown}
          >
            <div
              className="absolute h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg shadow-cyan-500/50 group-hover:scale-125 transition-transform"
              style={{ left: `calc(${progress}% - 8px)` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-8 h-8 bg-cyan-500/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress}% - 16px)` }}
            />
          </div>

          <div className="text-cyan-400 font-mono text-sm min-w-[120px]">
            {displayFrame} / {totalFrames - 1}
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={skipBackward}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-all hover:scale-110 active:scale-95"
              title="后退 10 帧"
            >
              <SkipBack size={20} />
            </button>

            <button
              onClick={togglePlay}
              className="p-4 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white shadow-lg shadow-cyan-500/30 transition-all hover:scale-105 active:scale-95 hover:shadow-cyan-500/50"
              title={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
            </button>

            <button
              onClick={skipForward}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-all hover:scale-110 active:scale-95"
              title="前进 10 帧"
            >
              <SkipForward size={20} />
            </button>
          </div>

          <div className="flex items-center gap-4">
            {currentFrameData && (
              <div className="flex gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">温度:</span>
                  <span className="text-orange-400 font-mono font-bold">
                    {currentFrameData.temperature.toFixed(1)} K
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">势能:</span>
                  <span className="text-purple-400 font-mono font-bold">
                    {currentFrameData.potentialEnergy.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5">
              <Gauge size={16} className="text-cyan-400" />
              <span className="text-slate-400 text-sm">速度:</span>
              <div className="flex gap-1">
                {SPEED_OPTIONS.map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-2 py-0.5 rounded text-xs font-mono transition-all ${
                      playbackSpeed === speed
                        ? 'bg-cyan-500 text-white'
                        : 'text-slate-400 hover:text-cyan-400 hover:bg-slate-700'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlaybackControls;
