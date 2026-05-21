import React from 'react';
import { Music, Disc, Cpu } from 'lucide-react';
import { MusicStyle, StyleInfo, MUSIC_STYLES } from '@/types';

/**
 * 风格选择组件属性接口
 * @interface StyleSelectorProps
 */
interface StyleSelectorProps {
  /** 当前选中的音乐风格，null 表示未选中 */
  selectedStyle: MusicStyle | null;
  /** 风格选择回调函数，接收选中的风格 ID */
  onStyleSelect: (style: MusicStyle) => void;
}

/**
 * 风格颜色配置接口
 * @interface StyleColorConfig
 */
interface StyleColorConfig {
  /** 背景色（半透明） */
  bg: string;
  /** 边框色 */
  border: string;
  /** 文字色 */
  text: string;
  /** 悬停背景色 */
  hoverBg: string;
  /** 发光阴影色 */
  shadow: string;
}

/**
 * 图标映射配置
 * 根据风格 ID 映射对应的 lucide-react 图标组件
 */
const iconMap: Record<MusicStyle, React.FC<{ className?: string }>> = {
  jazz: Music,       // 爵士风格使用 Music 图标（萨克斯风）
  classical: Disc,   // 古典风格使用 Disc 图标（唱片/小提琴）
  electronic: Cpu,   // 电子风格使用 Cpu 图标（芯片/合成器）
};

/**
 * 颜色映射配置
 * 根据风格 ID 映射对应的颜色方案
 * 爵士 - 酒红色系
 * 古典 - 墨绿色系
 * 电子 - 青蓝色系
 */
const colorMap: Record<MusicStyle, StyleColorConfig> = {
  jazz: {
    bg: 'bg-red-900/30',
    border: 'border-red-500',
    text: 'text-red-400',
    hoverBg: 'hover:bg-red-900/40',
    shadow: 'shadow-red-500/50',
  },
  classical: {
    bg: 'bg-emerald-900/30',
    border: 'border-emerald-500',
    text: 'text-emerald-400',
    hoverBg: 'hover:bg-emerald-900/40',
    shadow: 'shadow-emerald-500/50',
  },
  electronic: {
    bg: 'bg-cyan-900/30',
    border: 'border-cyan-500',
    text: 'text-cyan-400',
    hoverBg: 'hover:bg-cyan-900/40',
    shadow: 'shadow-cyan-500/50',
  },
};

/**
 * 风格选择组件
 * 展示三种音乐风格卡片，支持选择、悬停和选中动画效果
 * 
 * @component
 * @param {StyleSelectorProps} props - 组件属性
 * @returns {React.ReactElement} 渲染后的组件
 */
function StyleSelector({ selectedStyle, onStyleSelect }: StyleSelectorProps): React.ReactElement {
  /**
   * 过滤出需要显示的三种风格
   * 确保只渲染 jazz、classical、electronic 三种风格
   */
  const displayStyles = MUSIC_STYLES.filter((style: StyleInfo) => 
    ['jazz', 'classical', 'electronic'].includes(style.id)
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-4">
      {displayStyles.map((style: StyleInfo, index: number) => {
        // 获取当前风格对应的图标组件和颜色配置
        const Icon = iconMap[style.id];
        const colors = colorMap[style.id];
        const isSelected = selectedStyle === style.id;

        return (
          <button
            key={style.id}
            onClick={() => onStyleSelect(style.id)}
            className={`
              // 基础布局
              relative group flex flex-col items-center justify-center p-8 
              rounded-2xl border-2 min-h-[240px]
              
              // 玻璃拟态效果
              backdrop-blur-md bg-white/5
              
              // 过渡动画 - 所有属性变化时的平滑过渡
              transition-all duration-500 ease-out
              
              // 未选中状态样式
              ${!isSelected ? `border-white/10 text-gray-300 ${colors.hoverBg}` : ''}
              
              // 选中状态样式
              ${isSelected ? `${colors.bg} ${colors.border} ${colors.text}` : ''}
              
              // 悬停效果 - 3D 放大 + 发光边框
              hover:scale-[1.08] hover:z-10
              ${!isSelected ? 'hover:border-white/30' : ''}
              
              // 选中时的发光阴影
              ${isSelected ? `shadow-lg ${colors.shadow}` : ''}
              
              // 悬停时的发光阴影
              hover:shadow-xl ${isSelected ? colors.shadow : 'shadow-white/10'}
              
              // 渐入动画 - 按索引延迟出现
              animate-fade-in
            `}
            style={{
              // 动画延迟，使卡片依次出现
              animationDelay: `${index * 150}ms`,
              // 3D 变换原点
              transformOrigin: 'center center',
            }}
            aria-label={`选择${style.name}风格`}
            aria-pressed={isSelected}
          >
            {/* 选中时的霓虹边框动画层 */}
            {isSelected && (
              <div
                className={`
                  absolute inset-0 rounded-2xl -z-10
                  animate-pulse
                `}
                style={{
                  // 使用 CSS 变量实现霓虹发光效果
                  boxShadow: `
                    0 0 10px currentColor,
                    0 0 20px currentColor,
                    0 0 40px currentColor,
                    inset 0 0 20px currentColor
                  `,
                  opacity: 0.3,
                }}
              />
            )}

            {/* 风格图标容器 */}
            <div
              className={`
                mb-4 p-4 rounded-full
                transition-all duration-500 ease-out
                ${isSelected ? `${colors.bg} ${colors.text}` : 'bg-white/10 text-gray-400'}
                group-hover:scale-110 group-hover:rotate-6
                ${isSelected ? 'animate-float' : ''}
              `}
            >
              <Icon
                className={`
                  w-12 h-12
                  transition-all duration-300
                `}
                strokeWidth={1.5}
              />
            </div>

            {/* 风格中文名 */}
            <h3
              className={`
                text-2xl font-bold mb-1
                transition-all duration-300
                ${isSelected ? colors.text : 'text-white'}
              `}
            >
              {style.name}
            </h3>

            {/* 风格英文名 */}
            <p
              className={`
                text-sm uppercase tracking-widest mb-3
                transition-all duration-300
                ${isSelected ? colors.text : 'text-gray-400'}
              `}
            >
              {style.nameEn}
            </p>

            {/* 风格描述 */}
            <p
              className={`
                text-sm text-center max-w-[180px]
                transition-all duration-300
                ${isSelected ? 'text-white/80' : 'text-gray-500'}
              `}
            >
              {style.description}
            </p>

            {/* 选中指示器 - 右上角脉冲圆点 */}
            {isSelected && (
              <div
                className={`
                  absolute -top-2 -right-2 w-6 h-6 rounded-full
                  ${colors.bg} ${colors.border} border-2
                  flex items-center justify-center
                  animate-ping
                `}
              >
                <div
                  className={`w-2 h-2 rounded-full ${colors.text} animate-pulse`}
                />
              </div>
            )}

            {/* 悬停时的装饰性光晕 */}
            <div
              className={`
                absolute inset-0 rounded-2xl opacity-0
                transition-opacity duration-500
                pointer-events-none
                group-hover:opacity-100
              `}
              style={{
                background: `
                  radial-gradient(
                    circle at center,
                    ${style.accentColor}20 0%,
                    transparent 70%
                  )
                `,
              }}
            />
          </button>
        );
      })}
    </div>
  );
}

export default StyleSelector;
