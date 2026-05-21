import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { Note, NOTE_NAMES, midiToNoteName } from '@/types';

// ==================== 类型定义 ====================

/**
 * 钢琴卷帘组件属性接口
 */
interface PianoRollProps {
  /** 音符列表 */
  notes: Note[];
  /** 当前播放时间（秒） */
  currentTime: number;
  /** 总时长（秒） */
  duration: number;
  /** 音乐风格，决定音符颜色 */
  style: 'jazz' | 'classical' | 'electronic';
  /** 点击时间轴或卷帘区域时的定位回调 */
  onSeek?: (time: number) => void;
}

/**
 * 风格颜色配置接口
 */
interface StyleColors {
  /** 主色调 */
  primary: string;
  /** 渐变起始色 */
  gradientStart: string;
  /** 渐变结束色 */
  gradientEnd: string;
  /** 边框色 */
  border: string;
  /** 发光颜色 */
  glow: string;
}

/**
 * 视图状态接口，用于跟踪滚动和缩放
 */
interface ViewState {
  /** 水平滚动偏移（像素） */
  scrollLeft: number;
  /** 垂直滚动偏移（像素） */
  scrollTop: number;
  /** 时间轴缩放比例 */
  timeScale: number;
}

// ==================== 常量定义 ====================

/** 最低音高 MIDI 编号（A0） */
const MIN_PITCH = 21;
/** 最高音高 MIDI 编号（C8） */
const MAX_PITCH = 108;
/** 总音高数量（88键钢琴） */
const TOTAL_PITCHES = MAX_PITCH - MIN_PITCH + 1;
/** 每行音高的高度（像素） */
const PITCH_HEIGHT = 18;
/** 钢琴键盘宽度（像素） */
const KEYBOARD_WIDTH = 60;
/** 时间轴高度（像素） */
const TIMELINE_HEIGHT = 36;
/** 默认每秒像素数（时间缩放基准） */
const DEFAULT_PIXELS_PER_SECOND = 60;
/** 最小缩放比例 */
const MIN_TIME_SCALE = 0.25;
/** 最大缩放比例 */
const MAX_TIME_SCALE = 4;
/** 深色背景色 */
const BG_COLOR = '#0a0a0f';
/** 白键行背景色 */
const WHITE_KEY_BG = '#12121a';
/** 黑键行背景色 */
const BLACK_KEY_BG = '#0d0d14';
/** 网格线颜色 */
const GRID_COLOR = 'rgba(128, 128, 140, 0.15)';
/** 强网格线颜色（每小节） */
const GRID_STRONG_COLOR = 'rgba(128, 128, 140, 0.3)';
/** 播放指示线颜色 */
const PLAYHEAD_COLOR = '#ff3333';
/** 播放指示线发光颜色 */
const PLAYHEAD_GLOW = 'rgba(255, 51, 51, 0.6)';

// ==================== 风格颜色配置 ====================

/**
 * 根据音乐风格获取颜色配置
 * @param style - 音乐风格
 * @returns 颜色配置对象
 */
const getStyleColors = (style: 'jazz' | 'classical' | 'electronic'): StyleColors => {
  const colorMap: Record<string, StyleColors> = {
    jazz: {
      primary: '#8b0000',
      gradientStart: '#b22222',
      gradientEnd: '#8b0000',
      border: '#dc143c',
      glow: 'rgba(220, 20, 60, 0.8)',
    },
    classical: {
      primary: '#006400',
      gradientStart: '#228b22',
      gradientEnd: '#006400',
      border: '#32cd32',
      glow: 'rgba(50, 205, 50, 0.8)',
    },
    electronic: {
      primary: '#00bfff',
      gradientStart: '#00ffff',
      gradientEnd: '#00bfff',
      border: '#40e0d0',
      glow: 'rgba(0, 255, 255, 0.8)',
    },
  };
  return colorMap[style];
};

// ==================== 组件定义 ====================

/**
 * 钢琴卷帘组件
 * 用于可视化 MIDI 音符数据，支持播放、滚动、缩放等交互
 */
export default function PianoRoll({ notes, currentTime, duration, style, onSeek }: PianoRollProps) {
  // ==================== Ref 引用 ====================

  /** 容器元素引用，用于滚动监听 */
  const containerRef = useRef<HTMLDivElement>(null);
  /** 背景层 Canvas 引用（渲染网格、键盘背景等静态元素） */
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  /** 音符层 Canvas 引用（渲染音符块） */
  const noteCanvasRef = useRef<HTMLCanvasElement>(null);
  /** 播放线层 Canvas 引用（渲染播放位置指示线） */
  const playheadCanvasRef = useRef<HTMLCanvasElement>(null);
  /** 动画帧 ID，用于取消 requestAnimationFrame */
  const animationFrameRef = useRef<number | null>(null);
  /** 上一次渲染的时间，用于节流 */
  const lastRenderTimeRef = useRef<number>(0);
  /** 上一次的播放时间，用于检测变化 */
  const lastCurrentTimeRef = useRef<number>(-1);
  /** 上一次的视图状态，用于检测变化 */
  const lastViewStateRef = useRef<ViewState>({ scrollLeft: -1, scrollTop: -1, timeScale: -1 });

  // ==================== 状态管理 ====================

  /** 视图状态（滚动位置和缩放） */
  const [viewState, setViewState] = useState<ViewState>({
    scrollLeft: 0,
    scrollTop: 0,
    timeScale: 1,
  });

  // ==================== 计算属性 ====================

  /** 风格颜色配置 */
  const colors = useMemo(() => getStyleColors(style), [style]);

  /** 每秒像素数（考虑缩放） */
  const pixelsPerSecond = useMemo(
    () => DEFAULT_PIXELS_PER_SECOND * viewState.timeScale,
    [viewState.timeScale]
  );

  /** 钢琴卷帘总宽度（像素） */
  const totalWidth = useMemo(
    () => Math.max(duration * pixelsPerSecond, 1000),
    [duration, pixelsPerSecond]
  );

  /** 钢琴卷帘总高度（像素） */
  const totalHeight = useMemo(() => TOTAL_PITCHES * PITCH_HEIGHT, []);

  /** 预计算的黑键集合，用于快速判断 */
  const blackKeySet = useMemo(() => {
    const set = new Set<number>();
    for (let i = 0; i < 12; i++) {
      if (NOTE_NAMES[i].includes('#')) {
        set.add(i);
      }
    }
    return set;
  }, []);

  // ==================== 辅助函数 ====================

  /**
   * 判断 MIDI 音高是否为黑键
   * @param pitch - MIDI 音高编号
   * @returns 是否为黑键
   */
  const isBlackKey = useCallback(
    (pitch: number): boolean => {
      return blackKeySet.has(pitch % 12);
    },
    [blackKeySet]
  );

  /**
   * 将 MIDI 音高转换为 Y 坐标（从顶部开始）
   * @param pitch - MIDI 音高编号
   * @returns Y 坐标像素值
   */
  const pitchToY = useCallback(
    (pitch: number): number => {
      return (MAX_PITCH - pitch) * PITCH_HEIGHT;
    },
    []
  );

  /**
   * 将 Y 坐标转换为 MIDI 音高
   * @param y - Y 坐标像素值
   * @returns MIDI 音高编号
   */
  const yToPitch = useCallback(
    (y: number): number => {
      return MAX_PITCH - Math.floor(y / PITCH_HEIGHT);
    },
    []
  );

  /**
   * 将时间（秒）转换为 X 坐标
   * @param time - 时间（秒）
   * @returns X 坐标像素值
   */
  const timeToX = useCallback(
    (time: number): number => {
      return time * pixelsPerSecond;
    },
    [pixelsPerSecond]
  );

  /**
   * 将 X 坐标转换为时间（秒）
   * @param x - X 坐标像素值
   * @returns 时间（秒）
   */
  const xToTime = useCallback(
    (x: number): number => {
      return x / pixelsPerSecond;
    },
    [pixelsPerSecond]
  );

  // ==================== 渲染函数 ====================

  /**
   * 绘制背景层（网格、黑白键背景、钢琴键盘）
   * 此层为静态层，仅在滚动、缩放或尺寸变化时重绘
   */
  const drawBackground = useCallback(() => {
    const canvas = bgCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 获取容器尺寸
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const visibleWidth = containerWidth - KEYBOARD_WIDTH;
    const visibleHeight = containerHeight - TIMELINE_HEIGHT;

    // 设置 Canvas 实际尺寸（考虑设备像素比）
    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;

    // 缩放坐标系以适配高 DPI 屏幕
    ctx.scale(dpr, dpr);

    // 清空画布
    ctx.clearRect(0, 0, containerWidth, containerHeight);

    // 计算可见区域的音高范围
    const startPitch = yToPitch(viewState.scrollTop + visibleHeight);
    const endPitch = yToPitch(viewState.scrollTop);
    const visibleStartPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, startPitch - 1));
    const visibleEndPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, endPitch + 1));

    // 计算可见区域的时间范围
    const startTime = xToTime(viewState.scrollLeft);
    const endTime = xToTime(viewState.scrollLeft + visibleWidth);
    const visibleStartTime = Math.max(0, startTime - 1);
    const visibleEndTime = Math.max(0, Math.min(duration, endTime + 1));

    // -------------------- 绘制钢琴键盘区域 --------------------
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, TIMELINE_HEIGHT, KEYBOARD_WIDTH, containerHeight - TIMELINE_HEIGHT);

    // 绘制键盘按键
    for (let pitch = visibleStartPitch; pitch <= visibleEndPitch; pitch++) {
      const y = pitchToY(pitch) - viewState.scrollTop + TIMELINE_HEIGHT;
      const isBlack = isBlackKey(pitch);

      // 按键背景
      ctx.fillStyle = isBlack ? '#1a1a24' : '#2a2a3a';
      ctx.fillRect(0, y, KEYBOARD_WIDTH, PITCH_HEIGHT);

      // 按键边框
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, y + 0.5, KEYBOARD_WIDTH - 1, PITCH_HEIGHT - 1);

      // 白键上的黑键标记
      if (isBlack) {
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(KEYBOARD_WIDTH - 35, y + 2, 30, PITCH_HEIGHT - 4);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.strokeRect(KEYBOARD_WIDTH - 35 + 0.5, y + 2.5, 29, PITCH_HEIGHT - 5);
      }

      // 音名标签（只显示 C 音）
      if (pitch % 12 === 0) {
        const noteName = midiToNoteName(pitch);
        ctx.font = '10px Inter, system-ui, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = isBlack ? '#888' : '#aaa';
        ctx.fillText(noteName, KEYBOARD_WIDTH - 40, y + PITCH_HEIGHT / 2);
      }
    }

    // -------------------- 绘制卷帘区域背景 --------------------
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(KEYBOARD_WIDTH, TIMELINE_HEIGHT, containerWidth - KEYBOARD_WIDTH, containerHeight - TIMELINE_HEIGHT);

    // 绘制水平网格线和键位背景
    for (let pitch = visibleStartPitch; pitch <= visibleEndPitch; pitch++) {
      const y = pitchToY(pitch) - viewState.scrollTop + TIMELINE_HEIGHT;
      const isBlack = isBlackKey(pitch);

      // 黑白键行背景
      ctx.fillStyle = isBlack ? BLACK_KEY_BG : WHITE_KEY_BG;
      ctx.fillRect(KEYBOARD_WIDTH, y, containerWidth - KEYBOARD_WIDTH, PITCH_HEIGHT);

      // 水平网格线
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(KEYBOARD_WIDTH, y + 0.5);
      ctx.lineTo(containerWidth, y + 0.5);
      ctx.stroke();

      // C 音高亮线
      if (pitch % 12 === 0) {
        ctx.strokeStyle = GRID_STRONG_COLOR;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(KEYBOARD_WIDTH, y + 0.5);
        ctx.lineTo(containerWidth, y + 0.5);
        ctx.stroke();
      }
    }

    // 绘制垂直网格线（每拍）
    const beatsPerSecond = 2; // 120 BPM
    const startBeat = Math.floor(visibleStartTime * beatsPerSecond);
    const endBeat = Math.ceil(visibleEndTime * beatsPerSecond);

    for (let beat = startBeat; beat <= endBeat; beat++) {
      const time = beat / beatsPerSecond;
      const x = timeToX(time) - viewState.scrollLeft + KEYBOARD_WIDTH;

      // 判断是否为小节线（每4拍）
      const isBar = beat % 4 === 0;

      ctx.strokeStyle = isBar ? GRID_STRONG_COLOR : GRID_COLOR;
      ctx.lineWidth = isBar ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, TIMELINE_HEIGHT);
      ctx.lineTo(x + 0.5, containerHeight);
      ctx.stroke();
    }

    // -------------------- 绘制时间轴 --------------------
    ctx.fillStyle = '#0f0f15';
    ctx.fillRect(KEYBOARD_WIDTH, 0, containerWidth - KEYBOARD_WIDTH, TIMELINE_HEIGHT);

    // 时间轴边框
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(KEYBOARD_WIDTH, TIMELINE_HEIGHT - 0.5);
    ctx.lineTo(containerWidth, TIMELINE_HEIGHT - 0.5);
    ctx.stroke();

    // 时间刻度和标签
    for (let beat = startBeat; beat <= endBeat; beat++) {
      const time = beat / beatsPerSecond;
      const x = timeToX(time) - viewState.scrollLeft + KEYBOARD_WIDTH;
      const isBar = beat % 4 === 0;
      const isHalf = beat % 2 === 0;

      // 刻度线
      const tickHeight = isBar ? 12 : isHalf ? 8 : 4;
      ctx.strokeStyle = isBar ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = isBar ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x + 0.5, TIMELINE_HEIGHT - tickHeight);
      ctx.lineTo(x + 0.5, TIMELINE_HEIGHT);
      ctx.stroke();

      // 时间标签（每秒显示一次）
      if (isBar && beat % (beatsPerSecond * 4) === 0) {
        const seconds = Math.floor(time);
        ctx.font = '11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillText(`${seconds}s`, x, 4);
      }
    }

    // 键盘区域时间轴
    ctx.fillStyle = '#0f0f15';
    ctx.fillRect(0, 0, KEYBOARD_WIDTH, TIMELINE_HEIGHT);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.strokeRect(0.5, 0.5, KEYBOARD_WIDTH - 1, TIMELINE_HEIGHT - 1);
  }, [viewState, duration, pixelsPerSecond, isBlackKey, pitchToY, timeToX, xToTime, yToPitch]);

  /**
   * 绘制音符层
   * 仅渲染可见区域内的音符
   */
  const drawNotes = useCallback(() => {
    const canvas = noteCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const visibleWidth = containerWidth - KEYBOARD_WIDTH;
    const visibleHeight = containerHeight - TIMELINE_HEIGHT;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, containerWidth, containerHeight);

    // 计算可见区域
    const startPitch = yToPitch(viewState.scrollTop + visibleHeight);
    const endPitch = yToPitch(viewState.scrollTop);
    const visibleStartPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, startPitch - 1));
    const visibleEndPitch = Math.max(MIN_PITCH, Math.min(MAX_PITCH, endPitch + 1));

    const startTime = xToTime(viewState.scrollLeft);
    const endTime = xToTime(viewState.scrollLeft + visibleWidth);

    // 过滤可见区域内的音符
    const visibleNotes = notes.filter((note) => {
      const noteEnd = note.start + note.duration;
      return (
        note.pitch >= visibleStartPitch &&
        note.pitch <= visibleEndPitch &&
        noteEnd >= startTime &&
        note.start <= endTime
      );
    });

    // 绘制音符
    visibleNotes.forEach((note) => {
      const x = timeToX(note.start) - viewState.scrollLeft + KEYBOARD_WIDTH;
      const y = pitchToY(note.pitch) - viewState.scrollTop + TIMELINE_HEIGHT + 1;
      const width = timeToX(note.duration) - 2;
      const height = PITCH_HEIGHT - 2;

      // 判断音符是否正在播放（高亮发光）
      const isActive = currentTime >= note.start && currentTime < note.start + note.duration;

      // 创建渐变填充
      const gradient = ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, colors.gradientStart);
      gradient.addColorStop(1, colors.gradientEnd);

      // 发光效果（仅活跃音符）
      if (isActive) {
        ctx.shadowColor = colors.glow;
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      // 绘制音符主体
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(width, 4), height, 3);
      ctx.fill();

      // 绘制边框
      ctx.shadowBlur = 0;
      ctx.strokeStyle = isActive ? '#ffffff' : colors.border;
      ctx.lineWidth = isActive ? 2 : 1;
      ctx.stroke();

      // 根据力度调整透明度
      ctx.fillStyle = `rgba(255, 255, 255, ${note.velocity * 0.15})`;
      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(width, 4), height / 3, [3, 3, 0, 0]);
      ctx.fill();
    });
  }, [notes, currentTime, viewState, colors, pitchToY, timeToX, xToTime, yToPitch]);

  /**
   * 绘制播放位置指示线
   * 此层每帧更新，使用 requestAnimationFrame
   */
  const drawPlayhead = useCallback(() => {
    const canvas = playheadCanvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = containerWidth * dpr;
    canvas.height = containerHeight * dpr;
    canvas.style.width = `${containerWidth}px`;
    canvas.style.height = `${containerHeight}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, containerWidth, containerHeight);

    // 计算播放线位置
    const playheadX = timeToX(currentTime) - viewState.scrollLeft + KEYBOARD_WIDTH;

    // 只在可见区域内绘制
    if (playheadX >= KEYBOARD_WIDTH && playheadX <= containerWidth) {
      // 发光效果
      ctx.shadowColor = PLAYHEAD_GLOW;
      ctx.shadowBlur = 15;

      // 绘制主线条
      ctx.strokeStyle = PLAYHEAD_COLOR;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(playheadX, TIMELINE_HEIGHT);
      ctx.lineTo(playheadX, containerHeight);
      ctx.stroke();

      // 绘制顶部三角形
      ctx.shadowBlur = 0;
      ctx.fillStyle = PLAYHEAD_COLOR;
      ctx.beginPath();
      ctx.moveTo(playheadX - 8, TIMELINE_HEIGHT - 1);
      ctx.lineTo(playheadX + 8, TIMELINE_HEIGHT - 1);
      ctx.lineTo(playheadX, TIMELINE_HEIGHT + 12);
      ctx.closePath();
      ctx.fill();

      // 三角形边框
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.stroke();

      // 绘制内部发光核心
      ctx.shadowColor = PLAYHEAD_GLOW;
      ctx.shadowBlur = 25;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(playheadX, TIMELINE_HEIGHT);
      ctx.lineTo(playheadX, containerHeight);
      ctx.stroke();

      ctx.shadowBlur = 0;
    }
  }, [currentTime, viewState.scrollLeft, timeToX]);

  /**
   * 主渲染循环
   * 使用 requestAnimationFrame 实现流畅动画
   * 仅在需要时重绘各层
   */
  const render = useCallback(() => {
    const now = performance.now();

    // 检查是否需要重绘
    const viewChanged =
      lastViewStateRef.current.scrollLeft !== viewState.scrollLeft ||
      lastViewStateRef.current.scrollTop !== viewState.scrollTop ||
      lastViewStateRef.current.timeScale !== viewState.timeScale;

    const timeChanged = Math.abs(lastCurrentTimeRef.current - currentTime) > 0.01;

    // 节流：最多每 16ms 重绘一次（约 60fps）
    const shouldRender = now - lastRenderTimeRef.current >= 16;

    if (shouldRender) {
      lastRenderTimeRef.current = now;

      // 视图变化时重绘背景和音符
      if (viewChanged) {
        lastViewStateRef.current = { ...viewState };
        drawBackground();
        drawNotes();
      }

      // 播放时间变化时重绘音符（用于高亮）和播放线
      if (timeChanged || viewChanged) {
        lastCurrentTimeRef.current = currentTime;
        if (!viewChanged) {
          drawNotes();
        }
        drawPlayhead();
      }
    }

    animationFrameRef.current = requestAnimationFrame(render);
  }, [viewState, currentTime, drawBackground, drawNotes, drawPlayhead]);

  // ==================== 事件处理 ====================

  /**
   * 处理滚动事件
   */
  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    setViewState((prev) => ({
      ...prev,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    }));
  }, []);

  /**
   * 处理点击事件，用于定位播放位置
   */
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSeek) return;

      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;

      // 只在卷帘区域响应点击
      if (x > KEYBOARD_WIDTH && e.clientY - rect.top > TIMELINE_HEIGHT) {
        const time = xToTime(x - KEYBOARD_WIDTH + viewState.scrollLeft);
        onSeek(Math.max(0, Math.min(duration, time)));
      }
    },
    [onSeek, viewState.scrollLeft, duration, xToTime]
  );

  /**
   * 处理滚轮事件，支持 Ctrl+滚轮 缩放
   */
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLDivElement>) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();

        // 计算缩放锚点（鼠标位置）
        const container = containerRef.current;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left - KEYBOARD_WIDTH;
        const anchorTime = xToTime(mouseX + viewState.scrollLeft);

        // 计算新的缩放比例
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newTimeScale = Math.min(
          MAX_TIME_SCALE,
          Math.max(MIN_TIME_SCALE, viewState.timeScale * delta)
        );

        // 计算新的滚动位置，保持锚点位置不变
        const newPixelsPerSecond = DEFAULT_PIXELS_PER_SECOND * newTimeScale;
        const newScrollLeft = anchorTime * newPixelsPerSecond - mouseX;

        setViewState((prev) => ({
          ...prev,
          timeScale: newTimeScale,
          scrollLeft: Math.max(0, newScrollLeft),
        }));
      }
    },
    [viewState.timeScale, viewState.scrollLeft, xToTime]
  );

  /**
   * 自动滚动跟随播放位置
   */
  const autoScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const visibleWidth = containerWidth - KEYBOARD_WIDTH;
    const playheadX = timeToX(currentTime);

    // 计算当前可见区域
    const visibleStart = viewState.scrollLeft;
    const visibleEnd = viewState.scrollLeft + visibleWidth;

    // 如果播放头接近右边缘，自动滚动
    const scrollThreshold = visibleWidth * 0.8;
    if (playheadX > visibleStart + scrollThreshold && playheadX < totalWidth - visibleWidth * 0.2) {
      const newScrollLeft = Math.max(0, playheadX - visibleWidth * 0.3);
      container.scrollLeft = newScrollLeft;
    }

    // 如果播放头超出左边缘，滚动到播放位置
    if (playheadX < visibleStart + 50) {
      const newScrollLeft = Math.max(0, playheadX - visibleWidth * 0.3);
      container.scrollLeft = newScrollLeft;
    }
  }, [currentTime, viewState.scrollLeft, timeToX, totalWidth]);

  // ==================== 生命周期 ====================

  // 启动渲染循环
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);

  // 自动滚动跟随播放
  useEffect(() => {
    autoScroll();
  }, [currentTime, autoScroll]);

  // 音符或风格变化时重绘
  useEffect(() => {
    drawBackground();
    drawNotes();
  }, [notes, style, duration, drawBackground, drawNotes]);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      drawBackground();
      drawNotes();
      drawPlayhead();
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawBackground, drawNotes, drawPlayhead]);

  // ==================== 渲染 ====================

  return (
    <div className="w-full flex flex-col">
      {/* 缩放控制 */}
      <div className="flex items-center justify-between mb-2 px-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">缩放:</span>
          <div className="flex gap-1">
            <button
              onClick={() =>
                setViewState((prev) => ({
                  ...prev,
                  timeScale: Math.max(MIN_TIME_SCALE, prev.timeScale / 1.5),
                }))
              }
              className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
            >
              -
            </button>
            <span className="px-3 py-1 text-xs bg-gray-900 text-gray-300 rounded min-w-[60px] text-center">
              {Math.round(viewState.timeScale * 100)}%
            </span>
            <button
              onClick={() =>
                setViewState((prev) => ({
                  ...prev,
                  timeScale: Math.min(MAX_TIME_SCALE, prev.timeScale * 1.5),
                }))
              }
              className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
            >
              +
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500">
          按住 <kbd className="px-1 bg-gray-800 rounded">Ctrl</kbd> + 滚轮缩放
        </div>
      </div>

      {/* 钢琴卷帘容器 */}
      <div
        ref={containerRef}
        className="relative w-full overflow-auto border border-gray-700/50 rounded-lg bg-[#0a0a0f] select-none"
        style={{
          maxHeight: '500px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(128, 128, 140, 0.5) transparent',
        }}
        onScroll={handleScroll}
        onClick={handleClick}
        onWheel={handleWheel}
      >
        {/* 内容容器，用于撑开滚动区域 */}
        <div
          className="relative"
          style={{
            width: totalWidth + KEYBOARD_WIDTH,
            height: totalHeight + TIMELINE_HEIGHT,
          }}
        >
          {/* 背景层 Canvas（静态元素） */}
          <canvas
            ref={bgCanvasRef}
            className="absolute top-0 left-0"
            style={{ zIndex: 1 }}
          />

          {/* 音符层 Canvas */}
          <canvas
            ref={noteCanvasRef}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ zIndex: 2 }}
          />

          {/* 播放线层 Canvas */}
          <canvas
            ref={playheadCanvasRef}
            className="absolute top-0 left-0 pointer-events-none"
            style={{ zIndex: 3 }}
          />
        </div>
      </div>

      {/* 图例 */}
      <div className="flex items-center gap-6 mt-3 px-2 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-3 rounded"
            style={{
              background: `linear-gradient(180deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
              border: `1px solid ${colors.border}`,
            }}
          />
          <span>音符</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-3 rounded"
            style={{
              background: `linear-gradient(180deg, ${colors.gradientStart}, ${colors.gradientEnd})`,
              border: '1px solid #ffffff',
              boxShadow: `0 0 10px ${colors.glow}`,
            }}
          />
          <span>正在播放</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-red-500 rounded" style={{ boxShadow: '0 0 8px rgba(255, 51, 51, 0.8)' }} />
          <span>播放位置</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500">风格:</span>
          <span
            className="font-medium"
            style={{ color: colors.primary }}
          >
            {style === 'jazz' ? '爵士' : style === 'classical' ? '古典' : '电子'}
          </span>
        </div>
      </div>
    </div>
  );
}
