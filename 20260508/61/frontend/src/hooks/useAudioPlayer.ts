import { useState, useCallback, useRef, useEffect } from 'react';
import { Note, PlayerState } from '@/types';

// 默认播放器状态
const DEFAULT_STATE: PlayerState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.7,
  isMuted: false,
  isLooping: false,
  isLoading: false,
  error: null,
};

// 音频播放 Hook
export function useAudioPlayer(onEnded?: () => void) {
  // 播放器状态
  const [state, setState] = useState<PlayerState>(DEFAULT_STATE);
  // 音符列表
  const [notes, setNotes] = useState<Note[]>([]);
  // 当前播放的音符
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());

  // HTML5 Audio 元素引用
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // 通过 URL.createObjectURL 创建的对象 URL，用于释放资源
  const objectUrlRef = useRef<string | null>(null);
  // requestAnimationFrame 动画帧 ID
  const rafIdRef = useRef<number | null>(null);
  // 上一次的播放位置（用于音符激活检测）
  const lastTimeRef = useRef<number>(0);
  // 音符开始调度计时器引用
  const noteTimersRef = useRef<Map<number, number>>(new Map());

  // 清理资源函数
  const cleanupResources = useCallback(() => {
    // 取消 RAF 动画帧
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // 清理所有音符调度计时器
    noteTimersRef.current.forEach((timerId) => {
      clearTimeout(timerId);
    });
    noteTimersRef.current.clear();

    // 释放 URL.createObjectURL 创建的对象
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }

    // 清理音频元素事件监听器
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onloadedmetadata = null;
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }

    // 清空活跃音符
    setActiveNotes(new Set());
    lastTimeRef.current = 0;
  }, []);

  // 将 base64 字符串转换为 Blob 对象
  const base64ToBlob = useCallback((base64Data: string, isMp3: boolean): Blob => {
    // 移除可能存在的 base64 前缀（如 "data:audio/mp3;base64,"）
    const base64 = base64Data.includes(',')
      ? base64Data.split(',')[1]
      : base64Data;

    // 解码 base64 字符串
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    // 将二进制字符串转换为字节数组
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // 根据音频类型设置 MIME 类型
    const mimeType = isMp3 ? 'audio/mpeg' : 'audio/wav';
    return new Blob([bytes], { type: mimeType });
  }, []);

  // 更新播放进度（使用 requestAnimationFrame）
  const updateProgress = useCallback(() => {
    if (!audioRef.current) return;

    const currentTime = audioRef.current.currentTime;
    const duration = audioRef.current.duration;

    // 更新当前播放时间
    setState((prev) => ({ ...prev, currentTime }));

    // 检测音符激活状态
    if (notes.length > 0) {
      const prevTime = lastTimeRef.current;

      // 找出在 [prevTime, currentTime] 区间内开始的音符
      const newlyStartedNotes = notes.filter(
        (note) => note.start >= prevTime && note.start <= currentTime
      );

      // 找出已经结束的音符
      const endedNotes = notes.filter(
        (note) => note.start + note.duration <= currentTime
      );

      if (newlyStartedNotes.length > 0 || endedNotes.length > 0) {
        setActiveNotes((prev) => {
          const next = new Set(prev);
          newlyStartedNotes.forEach((note) => next.add(note.pitch));
          endedNotes.forEach((note) => next.delete(note.pitch));
          return next;
        });
      }

      lastTimeRef.current = currentTime;

      // 提前调度即将播放的音符（提升视觉同步效果）
      const lookahead = 0.1; // 100ms 预调度
      const upcomingNotes = notes.filter(
        (note) =>
          note.start > currentTime &&
          note.start <= currentTime + lookahead &&
          !noteTimersRef.current.has(note.pitch)
      );

      upcomingNotes.forEach((note) => {
        const delay = (note.start - currentTime) * 1000;
        const timerId = window.setTimeout(() => {
          setActiveNotes((prev) => {
            const next = new Set(prev);
            next.add(note.pitch);
            return next;
          });

          // 设置音符结束计时器
          const endTimerId = window.setTimeout(() => {
            setActiveNotes((prev) => {
              const next = new Set(prev);
              next.delete(note.pitch);
              return next;
            });
            noteTimersRef.current.delete(note.pitch);
          }, note.duration * 1000);

          noteTimersRef.current.set(note.pitch, endTimerId);
        }, delay);

        noteTimersRef.current.set(note.pitch, timerId);
      });
    }

    // 继续下一帧更新
    if (audioRef.current && !audioRef.current.paused) {
      rafIdRef.current = requestAnimationFrame(updateProgress);
    }
  }, [notes]);

  // 加载 base64 编码的音频
  const loadAudio = useCallback(
    (base64Data: string, isMp3: boolean, newNotes: Note[] = []) => {
      // 先清理现有资源
      cleanupResources();

      // 设置加载状态
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        // 将 base64 转换为 Blob
        const blob = base64ToBlob(base64Data, isMp3);

        // 创建对象 URL
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;

        // 创建音频元素
        const audio = new Audio();
        audioRef.current = audio;

        // 音频元数据加载完成事件
        audio.onloadedmetadata = () => {
          setState((prev) => ({
            ...prev,
            duration: audio.duration || 0,
            isLoading: false,
            currentTime: 0,
          }));
          setNotes(newNotes);
          lastTimeRef.current = 0;
        };

        // 音频播放结束事件
        audio.onended = () => {
          setState((prev) => ({ ...prev, isPlaying: false, currentTime: 0 }));
          setActiveNotes(new Set());
          lastTimeRef.current = 0;

          // 清理音符调度计时器
          noteTimersRef.current.forEach((timerId) => {
            clearTimeout(timerId);
          });
          noteTimersRef.current.clear();

          // 调用播放结束回调
          if (onEnded) {
            onEnded();
          }
        };

        // 音频加载错误事件
        audio.onerror = () => {
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: '音频加载失败，请检查文件格式',
          }));
        };

        // 设置音频源并开始加载
        audio.src = objectUrl;
        audio.preload = 'auto';
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : '音频解码失败',
        }));
      }
    },
    [base64ToBlob, cleanupResources, onEnded]
  );

  // 播放音频
  const play = useCallback(async (): Promise<void> => {
    if (!audioRef.current) {
      throw new Error('请先加载音频');
    }

    try {
      // 调用 HTML5 Audio API 的 play 方法（返回 Promise）
      await audioRef.current.play();

      // 更新播放状态
      setState((prev) => ({ ...prev, isPlaying: true, error: null }));

      // 启动进度更新动画帧
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
      }
      rafIdRef.current = requestAnimationFrame(updateProgress);
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isPlaying: false,
        error: err instanceof Error ? err.message : '播放失败',
      }));
      throw err;
    }
  }, [updateProgress]);

  // 暂停播放
  const pause = useCallback((): void => {
    if (!audioRef.current) return;

    // 暂停音频
    audioRef.current.pause();

    // 取消进度更新动画帧
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // 清理音符调度计时器
    noteTimersRef.current.forEach((timerId) => {
      clearTimeout(timerId);
    });
    noteTimersRef.current.clear();

    // 更新状态
    setState((prev) => ({ ...prev, isPlaying: false }));
    setActiveNotes(new Set());
  }, []);

  // 停止播放（重置到开始位置）
  const stop = useCallback((): void => {
    if (!audioRef.current) return;

    // 暂停并重置到开始位置
    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    // 取消进度更新动画帧
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    // 清理音符调度计时器
    noteTimersRef.current.forEach((timerId) => {
      clearTimeout(timerId);
    });
    noteTimersRef.current.clear();

    // 更新状态
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      currentTime: 0,
    }));
    setActiveNotes(new Set());
    lastTimeRef.current = 0;
  }, []);

  // 跳转到指定时间
  const seek = useCallback(
    (time: number): void => {
      if (!audioRef.current) return;

      // 确保时间在有效范围内
      const clampedTime = Math.max(
        0,
        Math.min(time, audioRef.current.duration || 0)
      );

      // 更新音频播放位置
      audioRef.current.currentTime = clampedTime;
      lastTimeRef.current = clampedTime;

      // 清理音符调度计时器
      noteTimersRef.current.forEach((timerId) => {
        clearTimeout(timerId);
      });
      noteTimersRef.current.clear();

      // 重新计算活跃音符
      if (notes.length > 0) {
        const currentlyActive = notes
          .filter(
            (note) =>
              note.start <= clampedTime &&
              note.start + note.duration > clampedTime
          )
          .map((note) => note.pitch);
        setActiveNotes(new Set(currentlyActive));
      }

      // 更新状态
      setState((prev) => ({ ...prev, currentTime: clampedTime }));
    },
    [notes]
  );

  // 设置音量
  const setVolume = useCallback((volume: number): void => {
    // 确保音量在 [0, 1] 范围内
    const clampedVolume = Math.max(0, Math.min(1, volume));

    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }

    // 更新状态
    setState((prev) => ({
      ...prev,
      volume: clampedVolume,
      isMuted: clampedVolume === 0,
    }));
  }, []);

  // 切换静音状态
  const toggleMute = useCallback((): void => {
    setState((prev) => {
      const newMuted = !prev.isMuted;

      if (audioRef.current) {
        audioRef.current.muted = newMuted;
      }

      return { ...prev, isMuted: newMuted };
    });
  }, []);

  // 切换循环播放状态
  const toggleLoop = useCallback((): void => {
    setState((prev) => {
      const newLooping = !prev.isLooping;

      if (audioRef.current) {
        audioRef.current.loop = newLooping;
      }

      return { ...prev, isLooping: newLooping };
    });
  }, []);

  // 播放单个音符（用于钢琴键盘预览）
  const playNote = useCallback(
    (pitch: number, duration: number = 0.5): void => {
      // 标记音符为活跃状态
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.add(pitch);
        return next;
      });

      // 音符结束后移除活跃状态
      setTimeout(() => {
        setActiveNotes((prev) => {
          const next = new Set(prev);
          next.delete(pitch);
          return next;
        });
      }, duration * 1000);
    },
    []
  );

  // 组件卸载时自动清理资源
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  // 初始化音频元素的音量和静音状态
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = state.volume;
      audioRef.current.muted = state.isMuted;
      audioRef.current.loop = state.isLooping;
    }
  }, [state.volume, state.isMuted, state.isLooping]);

  return {
    // 状态
    state,
    notes,
    activeNotes,
    // 方法
    loadAudio,
    play,
    pause,
    stop,
    seek,
    setVolume,
    toggleMute,
    toggleLoop,
    playNote,
  };
}
