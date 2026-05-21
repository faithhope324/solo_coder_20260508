import { useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles, Wand2, Settings2, Sliders, Info } from 'lucide-react';
import StyleSelector from '@/components/StyleSelector';
import PianoKeyboard from '@/components/PianoKeyboard';
import MidiUploader from '@/components/MidiUploader';
import PianoRoll from '@/components/PianoRoll';
import PlaybackControls from '@/components/PlaybackControls';
import FeedbackButtons from '@/components/FeedbackButtons';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { generateMusic } from '@/services/api';
import {
  MusicStyle,
  Note,
  GenerateRequest,
  GenerateResponse,
  MUSIC_STYLES,
} from '@/types';

/**
 * 主应用组件
 * 整合所有功能模块，提供完整的 AI 音乐生成体验
 */
function App() {
  // ==================== 状态管理 ====================

  // 选中的音乐风格
  const [selectedStyle, setSelectedStyle] = useState<MusicStyle | null>(null);
  // 起始音符 MIDI 编号数组（最多5个）
  const [startNotes, setStartNotes] = useState<number[]>([]);
  // 上传的 MIDI 文件数据（base64格式）
  const [midiData, setMidiData] = useState<string | null>(null);
  // 上传的 MIDI 文件名
  const [midiFileName, setMidiFileName] = useState<string | null>(null);
  // 生成温度参数（0.1-1.0），控制创造性
  const [temperature, setTemperature] = useState<number>(0.7);
  // 是否正在生成音乐
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  // 生成过程中的错误信息
  const [generateError, setGenerateError] = useState<string | null>(null);
  // 生成结果响应
  const [generateResult, setGenerateResult] = useState<GenerateResponse | null>(null);
  // 是否循环播放
  const [isLooping, setIsLooping] = useState<boolean>(false);
  // 页面是否已加载完成（用于动画控制）
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  // ==================== Hook 引用 ====================

  // 音频播放器 Hook
  const {
    state: playerState,
    notes,
    activeNotes,
    loadNotes,
    play,
    pause,
    stop,
    seek,
    setVolume,
    toggleMute,
    playNote,
  } = useAudioPlayer();

  // 滚动容器引用
  const containerRef = useRef<HTMLDivElement>(null);

  // ==================== 生命周期 ====================

  // 页面加载完成后触发动画
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // ==================== 事件处理函数 ====================

  /**
   * 处理音乐风格选择
   * @param style - 选中的音乐风格
   */
  const handleStyleSelect = useCallback((style: MusicStyle) => {
    setSelectedStyle(style);
    setGenerateError(null);
  }, []);

  /**
   * 处理起始音符变化
   * @param notes - 新的音符数组
   */
  const handleNotesChange = useCallback((notes: number[]) => {
    setStartNotes(notes);
  }, []);

  /**
   * 处理 MIDI 文件上传
   * @param data - MIDI 文件 base64 数据
   * @param name - 文件名
   */
  const handleMidiUpload = useCallback((data: string, name: string) => {
    setMidiData(data);
    setMidiFileName(name);
    setGenerateError(null);
  }, []);

  /**
   * 处理 MIDI 文件清除
   */
  const handleMidiClear = useCallback(() => {
    setMidiData(null);
    setMidiFileName(null);
  }, []);

  /**
   * 处理温度参数变化
   * @param value - 新的温度值
   */
  const handleTemperatureChange = useCallback((value: number) => {
    setTemperature(Math.max(0.1, Math.min(1.0, value)));
  }, []);

  /**
   * 处理播放/暂停切换
   */
  const handlePlayPause = useCallback(() => {
    if (playerState.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [playerState.isPlaying, play, pause]);

  /**
   * 处理重新开始播放
   */
  const handleRestart = useCallback(() => {
    stop();
    setTimeout(() => play(), 100);
  }, [stop, play]);

  /**
   * 处理循环播放切换
   */
  const handleToggleLoop = useCallback(() => {
    setIsLooping((prev) => !prev);
  }, []);

  /**
   * 生成音乐
   * 验证输入 -> 调用 API -> 加载音频 -> 显示结果
   */
  const handleGenerate = useCallback(async () => {
    // 验证必须选择风格
    if (!selectedStyle) {
      setGenerateError('请先选择音乐风格');
      return;
    }

    // 设置加载状态
    setIsGenerating(true);
    setGenerateError(null);
    // 停止当前播放
    stop();
    // 清空之前的结果
    setGenerateResult(null);

    try {
      // 构建请求参数
      const request: GenerateRequest = {
        style: selectedStyle,
        duration: 30, // 固定时长30秒
        temperature: temperature,
        // 可选参数：起始音符
        ...(startNotes.length > 0 && { startNotes }),
        // 可选参数：MIDI 种子
        ...(midiData && { midiFile: midiData }),
      };

      // 调用生成 API
      const response = await generateMusic(request);

      // 保存生成结果
      setGenerateResult(response);

      // 加载音符到播放器
      if (response.notes && response.notes.length > 0) {
        loadNotes(response.notes);
      }

      // 滚动到结果区域
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }, 300);
    } catch (err) {
      // 处理错误
      setGenerateError(
        err instanceof Error ? err.message : '生成失败，请稍后重试'
      );
    } finally {
      // 结束加载状态
      setIsGenerating(false);
    }
  }, [selectedStyle, temperature, startNotes, midiData, stop, loadNotes]);

  // ==================== 辅助函数 ====================

  /**
   * 格式化秒数为 MM:SS 格式
   * @param seconds - 秒数
   */
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  /**
   * 获取当前风格的颜色配置
   */
  const getStyleColors = useCallback(() => {
    if (!selectedStyle) return null;
    return MUSIC_STYLES.find((s) => s.id === selectedStyle);
  }, [selectedStyle]);

  // ==================== 渲染 ====================

  const styleColors = getStyleColors();

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 overflow-y-auto overflow-x-hidden"
    >
      {/* 背景装饰 - 波形动画 */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-0 right-0 h-64 opacity-30">
          <svg
            className="w-full h-full"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#06b6d4" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#f472b6" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <path
              className="animate-wave1"
              fill="url(#waveGradient)"
              d="M0,96L48,112C96,128,192,160,288,160C384,160,480,128,576,122.7C672,117,768,139,864,154.7C960,171,1056,181,1152,165.3C1248,149,1344,107,1392,85.3L1440,64L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
            />
            <path
              className="animate-wave2"
              fill="url(#waveGradient)"
              opacity="0.5"
              d="M0,192L48,208C96,224,192,256,288,250.7C384,245,480,203,576,181.3C672,160,768,160,864,170.7C960,181,1056,203,1152,197.3C1248,192,1344,160,1392,144L1440,128L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
            />
            <path
              className="animate-wave3"
              fill="url(#waveGradient)"
              opacity="0.3"
              d="M0,288L48,272C96,256,192,224,288,213.3C384,203,480,213,576,229.3C672,245,768,267,864,261.3C960,256,1056,224,1152,208C1248,192,1344,192,1392,192L1440,192L1440,0L1392,0C1344,0,1248,0,1152,0C1056,0,960,0,864,0C768,0,672,0,576,0C480,0,384,0,288,0C192,0,96,0,48,0L0,0Z"
            />
          </svg>
        </div>
        {/* 装饰性光晕 */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* 主内容区域 */}
      <div className="relative z-10 pb-32">
        {/* ==================== 头部 ==================== */}
        <header
          className={`
            relative pt-12 pb-8 px-4 md:px-8 text-center
            transition-all duration-1000 ease-out
            ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10'}
          `}
        >
          <div className="max-w-4xl mx-auto">
            {/* Logo 图标 */}
            <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-2xl bg-gradient-to-br from-purple-500/20 to-cyan-500/20 backdrop-blur-md border border-white/10">
              <Sparkles className="w-10 h-10 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400" />
            </div>
            {/* 标题 */}
            <h1 className="text-5xl md:text-7xl font-bold mb-4">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400">
                AI 音乐工坊
              </span>
            </h1>
            {/* 副标题 */}
            <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto">
              选择风格，输入灵感，让 AI 为你创作独一无二的音乐
            </p>
          </div>
        </header>

        {/* ==================== 主内容网格 ==================== */}
        <main className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* ==================== 左侧栏 ==================== */}
            <div
              className={`
                lg:col-span-4 space-y-6
                transition-all duration-700 ease-out delay-200
                ${isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}
              `}
            >
              {/* 风格选择卡片 */}
              <section className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative backdrop-blur-xl bg-slate-900/50 border border-white/10 rounded-2xl p-6 shadow-2xl">
                  <h2 className="flex items-center gap-3 text-xl font-semibold text-white mb-6">
                    <div className="p-2 rounded-lg bg-purple-500/20">
                      <Wand2 className="w-5 h-5 text-purple-400" />
                    </div>
                    选择音乐风格
                  </h2>
                  <StyleSelector
                    selectedStyle={selectedStyle}
                    onStyleSelect={handleStyleSelect}
                  />
                </div>
              </section>

              {/* MIDI 上传卡片 */}
              <section className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative backdrop-blur-xl bg-slate-900/50 border border-white/10 rounded-2xl p-6 shadow-2xl">
                  <h2 className="flex items-center gap-3 text-xl font-semibold text-white mb-6">
                    <div className="p-2 rounded-lg bg-cyan-500/20">
                      <Info className="w-5 h-5 text-cyan-400" />
                    </div>
                    上传 MIDI 种子
                    <span className="text-sm font-normal text-slate-500 ml-auto">
                      可选
                    </span>
                  </h2>
                  <MidiUploader
                    midiData={midiData}
                    fileName={midiFileName}
                    onMidiUpload={handleMidiUpload}
                    onMidiClear={handleMidiClear}
                  />
                </div>
              </section>
            </div>

            {/* ==================== 中间栏 ==================== */}
            <div
              className={`
                lg:col-span-5 space-y-6
                transition-all duration-700 ease-out delay-300
                ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
              `}
            >
              {/* 起始音符输入卡片 */}
              <section className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative backdrop-blur-xl bg-slate-900/50 border border-white/10 rounded-2xl p-6 shadow-2xl">
                  <h2 className="flex items-center gap-3 text-xl font-semibold text-white mb-6">
                    <div className="p-2 rounded-lg bg-amber-500/20">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    </div>
                    起始音符
                    <span className="text-sm font-normal text-slate-500 ml-auto">
                      最多 5 个
                    </span>
                  </h2>
                  <PianoKeyboard
                    selectedNotes={startNotes}
                    onNotesChange={handleNotesChange}
                  />
                </div>
              </section>

              {/* 生成参数卡片 */}
              <section className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative backdrop-blur-xl bg-slate-900/50 border border-white/10 rounded-2xl p-6 shadow-2xl">
                  <h2 className="flex items-center gap-3 text-xl font-semibold text-white mb-6">
                    <div className="p-2 rounded-lg bg-pink-500/20">
                      <Sliders className="w-5 h-5 text-pink-400" />
                    </div>
                    生成参数
                  </h2>
                  <div className="space-y-6">
                    {/* 温度滑块 */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-slate-300">
                          创造性（温度）
                        </label>
                        <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                          {temperature.toFixed(1)}
                        </span>
                      </div>
                      <div className="relative">
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.1"
                          value={temperature}
                          onChange={(e) =>
                            handleTemperatureChange(Number(e.target.value))
                          }
                          className="w-full h-2 appearance-none bg-slate-800 rounded-full cursor-pointer relative z-10"
                          style={{
                            background: `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(236, 72, 153) ${
                              ((temperature - 0.1) / 0.9) * 100
                            }%, rgb(51, 65, 85) ${
                              ((temperature - 0.1) / 0.9) * 100
                            }%, rgb(51, 65, 85) 100%)`,
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-slate-500">
                        <span>保守</span>
                        <span>平衡</span>
                        <span>创意</span>
                      </div>
                    </div>
                    {/* 固定时长提示 */}
                    <div className="flex items-center gap-3 p-4 rounded-xl bg-slate-800/50 border border-slate-700/50">
                      <Settings2 className="w-5 h-5 text-slate-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-300">
                          生成时长
                        </p>
                        <p className="text-lg font-bold text-white">
                          30 秒
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ==================== 右侧栏 ==================== */}
            <div
              className={`
                lg:col-span-3 space-y-6
                transition-all duration-700 ease-out delay-400
                ${isLoaded ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}
              `}
            >
              {/* 当前设置摘要 */}
              <section className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative backdrop-blur-xl bg-slate-900/50 border border-white/10 rounded-2xl p-6 shadow-2xl">
                  <h2 className="text-lg font-semibold text-white mb-4">当前设置</h2>
                  <div className="space-y-4">
                    {/* 风格 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">音乐风格</span>
                      <span
                        className="text-sm font-medium"
                        style={{ color: styleColors?.accentColor || '#94a3b8' }}
                      >
                        {styleColors?.name || '未选择'}
                      </span>
                    </div>
                    {/* 起始音符 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">起始音符</span>
                      <span className="text-sm font-medium text-amber-400">
                        {startNotes.length > 0 ? `${startNotes.length} 个` : '无'}
                      </span>
                    </div>
                    {/* MIDI 种子 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">MIDI 种子</span>
                      <span className="text-sm font-medium text-cyan-400">
                        {midiFileName ? '已上传' : '无'}
                      </span>
                    </div>
                    {/* 温度 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">温度参数</span>
                      <span className="text-sm font-medium text-pink-400">
                        {temperature.toFixed(1)}
                      </span>
                    </div>
                    {/* 时长 */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-400">生成时长</span>
                      <span className="text-sm font-medium text-emerald-400">
                        30 秒
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {/* 提示信息卡片 */}
              <section className="backdrop-blur-xl bg-slate-900/30 border border-white/5 rounded-2xl p-6">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-500 space-y-2">
                    <p>💡 选择风格后点击生成按钮开始创作</p>
                    <p>🎹 选择起始音符可以引导旋律走向</p>
                    <p>🎚️ 调整温度控制音乐的创造性</p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* ==================== 生成按钮（居中悬浮） ==================== */}
          <div
            className={`
              relative my-12 flex justify-center
              transition-all duration-700 ease-out delay-500
              ${isLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}
            `}
          >
            {/* 霓虹发光效果 */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-64 h-20 bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-cyan-500/30 rounded-full blur-3xl animate-pulse" />
            </div>
            {/* 按钮 */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedStyle}
              className={`
                relative group px-12 py-5 rounded-2xl
                font-bold text-xl text-white
                bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-600
                shadow-2xl
                transition-all duration-500 ease-out
                hover:scale-105 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                overflow-hidden
              `}
            >
              {/* 按钮内部发光 */}
              <div className="absolute inset-0 bg-gradient-to-r from-purple-400/0 via-white/20 to-cyan-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
              
              {/* 按钮内容 */}
              <div className="relative flex items-center gap-3">
                {isGenerating ? (
                  <>
                    <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                    正在生成...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-6 h-6" />
                    生成音乐
                  </>
                )}
              </div>

              {/* 按钮边框发光 */}
              <div className="absolute inset-0 rounded-2xl ring-2 ring-white/20 group-hover:ring-white/40 transition-all duration-300" />
            </button>
          </div>

          {/* ==================== 错误提示 ==================== */}
          {generateError && (
            <div
              className={`
                mb-8 p-6 rounded-2xl
                bg-red-500/10 border border-red-500/30
                backdrop-blur-xl
                animate-shake
              `}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-500/20">
                  <Info className="w-5 h-5 text-red-400" />
                </div>
                <p className="text-red-300 font-medium">{generateError}</p>
              </div>
            </div>
          )}

          {/* ==================== 钢琴卷帘（生成结果） ==================== */}
          {generateResult && (
            <section
              className={`
                mb-8 animate-fadeIn
              `}
            >
              <div className="relative group">
                <div
                  className="absolute inset-0 rounded-2xl blur-2xl opacity-30"
                  style={{
                    background: `linear-gradient(135deg, ${styleColors?.accentColor || '#a855f7'}40, transparent)`,
                  }}
                />
                <div className="relative backdrop-blur-xl bg-slate-900/50 border border-white/10 rounded-2xl p-6 shadow-2xl">
                  <h2 className="flex items-center gap-3 text-xl font-semibold text-white mb-6">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${styleColors?.accentColor || '#a855f7'}20` }}
                    >
                      <Sparkles
                        className="w-5 h-5"
                        style={{ color: styleColors?.accentColor || '#a855f7' }}
                      />
                    </div>
                    生成结果
                    <span
                      className="text-sm font-normal ml-auto px-3 py-1 rounded-full"
                      style={{
                        backgroundColor: `${styleColors?.accentColor || '#a855f7'}20`,
                        color: styleColors?.accentColor || '#a855f7',
                      }}
                    >
                      {styleColors?.name || ''}
                    </span>
                  </h2>
                  <PianoRoll
                    notes={generateResult.notes || []}
                    currentTime={playerState.currentTime}
                    duration={playerState.duration}
                    style={generateResult.style as 'jazz' | 'classical' | 'electronic'}
                    onSeek={seek}
                  />
                </div>
              </div>
            </section>
          )}

          {/* ==================== 反馈按钮 ==================== */}
          {generateResult && (
            <section
              className={`
                mb-8 animate-fadeIn
              `}
              style={{ animationDelay: '0.2s' }}
            >
              <FeedbackButtons
                taskId={generateResult.taskId}
                disabled={isGenerating}
              />
            </section>
          )}
        </main>

        {/* ==================== 页脚 ==================== */}
        <footer
          className={`
            mt-16 py-8 px-4 text-center text-slate-500 text-sm
            transition-all duration-1000 ease-out delay-700
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
          `}
        >
          <p>© 2024 AI 音乐工坊 - 用人工智能创造无限可能</p>
        </footer>
      </div>

      {/* ==================== 播放控制栏（底部固定） ==================== */}
      {generateResult && (
        <PlaybackControls
          isPlaying={playerState.isPlaying}
          currentTime={playerState.currentTime}
          duration={playerState.duration}
          volume={playerState.volume}
          isLooping={isLooping}
          midiData={generateResult.midiData}
          mp3Data={generateResult.mp3Data}
          taskId={generateResult.taskId}
          onPlayPause={handlePlayPause}
          onSeek={seek}
          onVolumeChange={setVolume}
          onToggleMute={toggleMute}
          onToggleLoop={handleToggleLoop}
          onRestart={handleRestart}
        />
      )}

      {/* ==================== 内联动画样式 ==================== */}
      <style>{`
        /* 波浪动画 */
        @keyframes wave1 {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-10px) scaleY(1.1); }
        }
        @keyframes wave2 {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-15px) scaleY(1.15); }
        }
        @keyframes wave3 {
          0%, 100% { transform: translateY(0) scaleY(1); }
          50% { transform: translateY(-5px) scaleY(1.05); }
        }
        .animate-wave1 {
          animation: wave1 8s ease-in-out infinite;
        }
        .animate-wave2 {
          animation: wave2 10s ease-in-out infinite;
          animation-delay: -2s;
        }
        .animate-wave3 {
          animation: wave3 12s ease-in-out infinite;
          animation-delay: -4s;
        }

        /* 淡入动画 */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out forwards;
        }

        /* 抖动动画 */
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-out;
        }

        /* 滑块自定义样式 */
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          box-shadow: 0 0 12px rgba(168, 85, 247, 0.6);
          transition: all 0.2s;
        }
        input[type="range"]::-webkit-slider-thumb:hover {
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.9);
          transform: scale(1.1);
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 12px rgba(168, 85, 247, 0.6);
          transition: all 0.2s;
        }
        input[type="range"]::-moz-range-thumb:hover {
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.9);
          transform: scale(1.1);
        }
        input[type="range"]:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* 玻璃拟态滚动条 */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  );
}

export default App;
