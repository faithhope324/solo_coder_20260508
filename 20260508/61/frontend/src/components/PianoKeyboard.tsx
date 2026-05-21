import { useState, useCallback, useRef, useEffect } from 'react';
import { midiToNoteName, NOTE_NAMES } from '@/types';

// ==================== 类型定义 ====================

// 钢琴键盘组件属性
interface PianoKeyboardProps {
  // 当前选中的音符 MIDI 编号数组
  selectedNotes: number[];
  // 选中音符变化回调
  onNotesChange: (notes: number[]) => void;
}

// 白键信息
interface WhiteKeyInfo {
  note: string;
  midi: number;
  hasBlackKey: boolean;
}

// 黑键信息
interface BlackKeyInfo {
  note: string;
  midi: number;
  position: number;
}

// ==================== 常量定义 ====================

// 起始 MIDI 编号（C4 = 60）
const START_MIDI = 60;
// 结束 MIDI 编号（B5 = 83）
const END_MIDI = 83;
// 最大选中音符数量
const MAX_SELECTED = 5;
// 白键宽度（像素）
const WHITE_KEY_WIDTH = 48;
// 黑键宽度（像素）
const BLACK_KEY_WIDTH = 28;
// 白键高度（像素）
const WHITE_KEY_HEIGHT = 180;
// 黑键高度（像素）
const BLACK_KEY_HEIGHT = 110;

// ==================== 组件定义 ====================

export default function PianoKeyboard({ selectedNotes, onNotesChange }: PianoKeyboardProps) {
  // ==================== 状态管理 ====================

  // 悬停的琴键 MIDI 编号
  const [hoveredKey, setHoveredKey] = useState<number | null>(null);
  // Web Audio API 上下文引用
  const audioContextRef = useRef<AudioContext | null>(null);

  // ==================== 生命周期 ====================

  // 组件卸载时清理音频上下文
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // ==================== 音频处理 ====================

  /**
   * 初始化或获取音频上下文
   * 懒加载创建，避免不必要的资源占用
   */
  const getAudioContext = useCallback((): AudioContext => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  /**
   * 播放钢琴音效
   * 使用 Web Audio API 生成简单的钢琴音色
   * @param midi - MIDI 音符编号
   */
  const playNote = useCallback((midi: number) => {
    const ctx = getAudioContext();

    // 将 MIDI 编号转换为频率（A4 = 69 = 440Hz）
    const frequency = 440 * Math.pow(2, (midi - 69) / 12);

    // 创建振荡器（声音源）
    const oscillator = ctx.createOscillator();
    // 创建增益节点（控制音量）
    const gainNode = ctx.createGain();

    // 使用三角波模拟钢琴音色
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // 添加泛音使音色更丰富
    const oscillator2 = ctx.createOscillator();
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(frequency * 2, ctx.currentTime);

    const gainNode2 = ctx.createGain();
    gainNode2.gain.setValueAtTime(0.3, ctx.currentTime);

    // 音量包络（ADSR 简化版）
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.5, now + 0.01); // Attack
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.1); // Decay
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.3); // Sustain
    gainNode.gain.linearRampToValueAtTime(0, now + 0.8); // Release

    gainNode2.gain.setValueAtTime(0, now);
    gainNode2.gain.linearRampToValueAtTime(0.15, now + 0.01);
    gainNode2.gain.linearRampToValueAtTime(0, now + 0.5);

    // 连接节点：振荡器 -> 增益 -> 输出
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator2.connect(gainNode2);
    gainNode2.connect(ctx.destination);

    // 开始和停止播放
    oscillator.start(now);
    oscillator.stop(now + 0.8);
    oscillator2.start(now);
    oscillator2.stop(now + 0.5);
  }, [getAudioContext]);

  // ==================== 琴键数据生成 ====================

  /**
   * 生成白键列表
   * 范围：C4 到 B5，共 24 个白键
   */
  const whiteKeys: WhiteKeyInfo[] = [];
  for (let midi = START_MIDI; midi <= END_MIDI; midi++) {
    const noteIndex = midi % 12;
    const noteName = NOTE_NAMES[noteIndex];
    // 判断是否为白键（不包含 # 符号）
    if (!noteName.includes('#')) {
      whiteKeys.push({
        note: noteName,
        midi: midi,
        // E 和 B 后面没有黑键
        hasBlackKey: noteIndex !== 4 && noteIndex !== 11,
      });
    }
  }

  /**
   * 生成黑键列表
   * 范围：C4 到 B5，共 17 个黑键
   */
  const blackKeys: BlackKeyInfo[] = [];
  let whiteKeyIndex = 0;

  for (let midi = START_MIDI; midi <= END_MIDI; midi++) {
    const noteIndex = midi % 12;
    const noteName = NOTE_NAMES[noteIndex];

    if (!noteName.includes('#')) {
      // 白键，增加索引
      whiteKeyIndex++;
    } else {
      // 黑键，记录位置（前一个白键的索引）
      blackKeys.push({
        note: noteName,
        midi: midi,
        position: whiteKeyIndex - 1,
      });
    }
  }

  // ==================== 事件处理 ====================

  /**
   * 处理琴键点击
   * 切换音符选中状态，最多选择 5 个音符
   * @param midi - 被点击的 MIDI 音符编号
   */
  const handleKeyClick = useCallback((midi: number) => {
    // 播放音效
    playNote(midi);

    // 检查是否已选中
    const isSelected = selectedNotes.includes(midi);

    if (isSelected) {
      // 如果已选中，取消选中
      const newNotes = selectedNotes.filter(n => n !== midi);
      onNotesChange(newNotes);
    } else {
      // 如果未选中，检查是否达到最大数量
      if (selectedNotes.length >= MAX_SELECTED) {
        // 超过最大数量，移除第一个选中的音符
        const newNotes = [...selectedNotes.slice(1), midi];
        onNotesChange(newNotes);
      } else {
        // 未超过最大数量，添加到选中列表
        const newNotes = [...selectedNotes, midi];
        onNotesChange(newNotes);
      }
    }
  }, [selectedNotes, onNotesChange, playNote]);

  /**
   * 处理鼠标悬停
   * @param midi - 悬停的 MIDI 音符编号
   */
  const handleMouseEnter = useCallback((midi: number) => {
    setHoveredKey(midi);
  }, []);

  /**
   * 处理鼠标离开
   */
  const handleMouseLeave = useCallback(() => {
    setHoveredKey(null);
  }, []);

  // ==================== 渲染辅助函数 ====================

  /**
   * 判断琴键是否被选中
   * @param midi - MIDI 音符编号
   */
  const isSelected = (midi: number): boolean => selectedNotes.includes(midi);

  /**
   * 判断琴键是否被悬停
   * @param midi - MIDI 音符编号
   */
  const isHovered = (midi: number): boolean => hoveredKey === midi;

  // ==================== 渲染 ====================

  return (
    <div className="w-full">
      {/* 玻璃拟态容器 */}
      <div className="glass rounded-2xl p-6 shadow-2xl">
        {/* 标题和选中音符显示区域 */}
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">
            选择起始音符
            <span className="ml-2 text-sm font-normal text-gray-400">
              （最多选择 {MAX_SELECTED} 个）
            </span>
          </h3>

          {/* 显示已选中的音符名称 */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">已选：</span>
            {selectedNotes.length > 0 ? (
              <div className="flex gap-2">
                {selectedNotes.map((midi) => (
                  <span
                    key={midi}
                    className="px-3 py-1 bg-gradient-to-r from-gold-500 to-amber-500 text-white text-sm font-medium rounded-full shadow-lg animate-pulse-glow"
                    style={{ color: '#fbbf24' }}
                  >
                    {midiToNoteName(midi)}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-500">点击琴键选择音符</span>
            )}
          </div>
        </div>

        {/* 钢琴键盘区域 */}
        <div className="relative mx-auto" style={{ width: whiteKeys.length * WHITE_KEY_WIDTH }}>
          {/* 白键层 */}
          <div className="flex">
            {whiteKeys.map((key, index) => {
              const selected = isSelected(key.midi);
              const hovered = isHovered(key.midi);

              return (
                <div
                  key={key.midi}
                  className={`
                    relative cursor-pointer transition-all duration-150
                    bg-gradient-to-b from-white to-gray-100
                    border border-gray-300 rounded-b-lg
                    hover:from-gray-100 hover:to-gray-200
                    ${selected ? 'ring-4 ring-gold-400 z-20' : ''}
                    ${hovered && !selected ? 'transform translate-y-1' : ''}
                  `}
                  style={{
                    width: WHITE_KEY_WIDTH,
                    height: WHITE_KEY_HEIGHT,
                    marginLeft: index === 0 ? 0 : -1,
                    boxShadow: selected
                      ? '0 0 20px rgba(251, 191, 36, 0.8), 0 0 40px rgba(251, 191, 36, 0.4), inset 0 -2px 4px rgba(0, 0, 0, 0.1)'
                      : '0 4px 6px rgba(0, 0, 0, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.1)',
                  }}
                  onClick={() => handleKeyClick(key.midi)}
                  onMouseEnter={() => handleMouseEnter(key.midi)}
                  onMouseLeave={handleMouseLeave}
                >
                  {/* 选中时的发光效果 */}
                  {selected && (
                    <div
                      className="absolute inset-0 rounded-b-lg animate-pulse-glow pointer-events-none"
                      style={{
                        boxShadow: 'inset 0 0 20px rgba(251, 191, 36, 0.3)',
                      }}
                    />
                  )}

                  {/* 音符名称显示 */}
                  <div
                    className={`
                      absolute bottom-3 left-1/2 -translate-x-1/2 text-xs font-medium
                      transition-colors duration-150
                      ${selected ? 'text-gold-600' : 'text-gray-500'}
                    `}
                  >
                    {key.note}
                    {Math.floor(key.midi / 12) - 1}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 黑键层（绝对定位在白键上方） */}
          {blackKeys.map((key) => {
            const selected = isSelected(key.midi);
            const hovered = isHovered(key.midi);
            const leftOffset = key.position * WHITE_KEY_WIDTH + WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2;

            return (
              <div
                key={key.midi}
                className={`
                  absolute top-0 cursor-pointer transition-all duration-150 z-10
                  bg-gradient-to-b from-gray-800 to-gray-950 rounded-b-md
                  hover:from-gray-700 hover:to-gray-900
                  ${selected ? 'ring-4 ring-gold-400 z-30' : ''}
                  ${hovered && !selected ? 'transform translate-y-1' : ''}
                `}
                style={{
                  left: leftOffset,
                  width: BLACK_KEY_WIDTH,
                  height: BLACK_KEY_HEIGHT,
                  boxShadow: selected
                    ? '0 0 20px rgba(251, 191, 36, 0.8), 0 0 40px rgba(251, 191, 36, 0.4), inset 0 -2px 4px rgba(255, 255, 255, 0.1)'
                    : '0 4px 8px rgba(0, 0, 0, 0.5), inset 0 -2px 4px rgba(255, 255, 255, 0.1)',
                }}
                onClick={() => handleKeyClick(key.midi)}
                onMouseEnter={() => handleMouseEnter(key.midi)}
                onMouseLeave={handleMouseLeave}
              >
                {/* 选中时的发光效果 */}
                {selected && (
                  <div
                    className="absolute inset-0 rounded-b-md animate-pulse-glow pointer-events-none"
                    style={{
                      boxShadow: 'inset 0 0 15px rgba(251, 191, 36, 0.4)',
                    }}
                  />
                )}

                {/* 音符名称显示 */}
                <div
                  className={`
                    absolute bottom-2 left-1/2 -translate-x-1/2 text-xs font-medium
                    transition-colors duration-150
                    ${selected ? 'text-gold-400' : 'text-gray-500'}
                  `}
                >
                  {key.note}
                </div>
              </div>
            );
          })}
        </div>

        {/* 底部提示信息 */}
        <div className="mt-6 text-center text-sm text-gray-400">
          <p>
            已选择 <span className="text-gold-400 font-bold">{selectedNotes.length}</span> / {MAX_SELECTED} 个音符
            {selectedNotes.length > 0 && (
              <span className="ml-2">
                （点击已选中的琴键可取消选择）
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
