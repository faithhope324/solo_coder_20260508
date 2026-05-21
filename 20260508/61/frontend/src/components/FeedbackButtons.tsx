import { useState, useCallback } from 'react';
import { ThumbsUp, ThumbsDown, Send, Check, Heart } from 'lucide-react';
import { submitFeedback } from '@/services/api';

// 反馈按钮组件属性接口
interface FeedbackButtonsProps {
  // 任务ID，用于关联反馈
  taskId: string | null;
  // 是否禁用组件
  disabled?: boolean;
}

// 粒子属性接口
interface Particle {
  // 粒子唯一标识
  id: number;
  // X轴偏移量
  x: number;
  // Y轴偏移量
  y: number;
  // 粒子大小
  size: number;
  // 粒子颜色
  color: string;
  // 动画延迟时间
  delay: number;
}

// 反馈按钮组件
function FeedbackButtons({ taskId, disabled = false }: FeedbackButtonsProps) {
  // 当前选择的评分状态：喜欢、不喜欢或未选择
  const [rating, setRating] = useState<'like' | 'dislike' | null>(null);
  // 评论文本内容
  const [comment, setComment] = useState<string>('');
  // 是否正在提交反馈
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  // 是否提交成功
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  // 错误信息
  const [error, setError] = useState<string | null>(null);
  // 粒子数组，用于动画效果
  const [particles, setParticles] = useState<Particle[]>([]);
  // 是否显示评论输入框
  const [showComment, setShowComment] = useState<boolean>(false);
  // 正在播放动画的按钮类型
  const [animatingButton, setAnimatingButton] = useState<'like' | 'dislike' | null>(null);

  // 生成粒子效果
  // 参数 type: 按钮类型，决定粒子颜色
  const createParticles = useCallback((type: 'like' | 'dislike') => {
    // 粒子基础颜色：喜欢用绿色系，不喜欢用红色系
    const colors = type === 'like'
      ? ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0']
      : ['#ec4899', '#f472b6', '#f9a8d4', '#fbcfe8'];

    // 生成12个随机分布的粒子
    const newParticles: Particle[] = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      // 随机角度分布，通过三角函数计算偏移
      x: Math.cos((i * 30 * Math.PI) / 180) * (30 + Math.random() * 40),
      y: Math.sin((i * 30 * Math.PI) / 180) * (30 + Math.random() * 40),
      // 随机大小 4-8px
      size: 4 + Math.random() * 4,
      // 随机选择颜色
      color: colors[Math.floor(Math.random() * colors.length)],
      // 随机延迟，形成错落的爆炸效果
      delay: Math.random() * 0.1,
    }));

    setParticles(newParticles);
    // 动画结束后清除粒子
    setTimeout(() => setParticles([]), 800);
  }, []);

  // 处理评分按钮点击
  // 参数 type: 点击的按钮类型（喜欢/不喜欢）
  const handleRatingClick = useCallback((type: 'like' | 'dislike') => {
    if (disabled || isSubmitting || isSuccess) return;

    // 如果点击已选中的按钮，则取消选择
    const newRating = rating === type ? null : type;
    setRating(newRating);
    setError(null);

    // 触发动画效果
    setAnimatingButton(type);
    createParticles(type);
    setTimeout(() => setAnimatingButton(null), 400);
  }, [rating, disabled, isSubmitting, isSuccess, createParticles]);

  // 处理评论输入变化
  const handleCommentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setComment(e.target.value);
  }, []);

  // 提交反馈
  const handleSubmit = useCallback(async () => {
    // 验证：必须有 taskId 和 rating
    if (!taskId || !rating || isSubmitting || isSuccess || disabled) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // 调用 API 提交反馈
      await submitFeedback({
        taskId,
        rating,
        comment: comment.trim() || undefined,
      });

      // 提交成功
      setIsSuccess(true);
    } catch (err) {
      // 处理错误
      setError(err instanceof Error ? err.message : '提交反馈失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  }, [taskId, rating, comment, isSubmitting, isSuccess, disabled]);

  // 重置组件状态
  const handleReset = useCallback(() => {
    setRating(null);
    setComment('');
    setIsSuccess(false);
    setError(null);
    setShowComment(false);
  }, []);

  // 提交成功状态
  if (isSuccess) {
    return (
      <div className="w-full max-w-md mx-auto">
        {/* 玻璃拟态成功卡片 */}
        <div className="
          relative p-6 rounded-2xl
          bg-classic-emerald-500/10 backdrop-blur-xl
          border border-classic-emerald-500/30
          shadow-lg shadow-classic-emerald-500/10
          animate-scale-in
        ">
          {/* 成功图标 */}
          <div className="flex flex-col items-center text-center">
            <div className="
              w-16 h-16 rounded-full
              bg-classic-emerald-500/20
              flex items-center justify-center
              mb-4 animate-bounce
            ">
              <Check className="w-8 h-8 text-classic-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-classic-emerald-300 mb-2">
              感谢您的反馈！
            </h3>
            <p className="text-sm text-deep-indigo-300 mb-4">
              您的评价将帮助我们不断改进音乐生成质量。
            </p>
            <button
              onClick={handleReset}
              className="
                px-4 py-2 rounded-lg
                bg-deep-indigo-600/30 hover:bg-deep-indigo-600/50
                border border-deep-indigo-500/30
                text-deep-indigo-200 text-sm
                transition-all duration-300
                hover:scale-105
              "
            >
              继续评价
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* 玻璃拟态主卡片 */}
      <div className="
        relative p-6 rounded-2xl
        bg-white/5 backdrop-blur-xl
        border border-white/10
        shadow-2xl shadow-black/20
      ">
        {/* 装饰性背景光晕 */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-neon-purple-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-cyber-cyan-500/10 rounded-full blur-3xl" />
        </div>

        {/* 标题 */}
        <h3 className="relative text-lg font-semibold text-white text-center mb-6">
          您觉得这段音乐怎么样？
        </h3>

        {/* 评分按钮区域 */}
        <div className="relative flex items-center justify-center gap-6 mb-6">
          {/* 喜欢按钮 */}
          <div className="relative">
            <button
              onClick={() => handleRatingClick('like')}
              disabled={disabled || isSubmitting}
              className={`
                relative p-5 rounded-2xl
                transition-all duration-300 ease-out
                border-2
                ${rating === 'like'
                  ? 'bg-gradient-to-br from-classic-emerald-500/30 to-classic-emerald-600/30 border-classic-emerald-400 shadow-lg shadow-classic-emerald-500/40'
                  : 'bg-white/5 border-white/10 hover:border-classic-emerald-500/50 hover:bg-classic-emerald-500/10'
                }
                ${animatingButton === 'like' ? 'animate-bounce' : ''}
                hover:scale-110 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              `}
            >
              {/* 选中状态的发光效果 */}
              {rating === 'like' && (
                <div className="absolute inset-0 rounded-2xl animate-pulse-glow text-classic-emerald-400" />
              )}

              {/* 心形图标 */}
              <Heart
                className={`
                  relative w-8 h-8 transition-all duration-300
                  ${rating === 'like' ? 'text-classic-emerald-400 fill-classic-emerald-400' : 'text-gray-400'}
                `}
              />

              {/* 粒子爆炸效果 */}
              {particles.map((particle) => (
                <span
                  key={particle.id}
                  className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
                  style={{
                    width: particle.size,
                    height: particle.size,
                    backgroundColor: particle.color,
                    animation: `particle-explode 0.8s ease-out forwards`,
                    animationDelay: `${particle.delay}s`,
                    '--tx': `${particle.x}px`,
                    '--ty': `${particle.y}px`,
                  } as React.CSSProperties}
                />
              ))}
            </button>

            {/* 标签文字 */}
            <p className={`
              text-xs text-center mt-2 font-medium transition-colors duration-300
              ${rating === 'like' ? 'text-classic-emerald-400' : 'text-gray-500'}
            `}>
              喜欢
            </p>
          </div>

          {/* 不喜欢按钮 */}
          <div className="relative">
            <button
              onClick={() => handleRatingClick('dislike')}
              disabled={disabled || isSubmitting}
              className={`
                relative p-5 rounded-2xl
                transition-all duration-300 ease-out
                border-2
                ${rating === 'dislike'
                  ? 'bg-gradient-to-br from-jazz-burgundy-500/30 to-jazz-burgundy-600/30 border-jazz-burgundy-400 shadow-lg shadow-jazz-burgundy-500/40'
                  : 'bg-white/5 border-white/10 hover:border-jazz-burgundy-500/50 hover:bg-jazz-burgundy-500/10'
                }
                ${animatingButton === 'dislike' ? 'animate-bounce' : ''}
                hover:scale-110 active:scale-95
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              `}
            >
              {/* 选中状态的发光效果 */}
              {rating === 'dislike' && (
                <div className="absolute inset-0 rounded-2xl animate-pulse-glow text-jazz-burgundy-400" />
              )}

              {/* 拇指向下图标 */}
              <ThumbsDown
                className={`
                  relative w-8 h-8 transition-all duration-300
                  ${rating === 'dislike' ? 'text-jazz-burgundy-400' : 'text-gray-400'}
                `}
              />

              {/* 粒子爆炸效果 - 过滤出不喜欢按钮的粒子 */}
              {particles
                .filter((_, index) => index >= 6)
                .map((particle) => (
                  <span
                    key={particle.id}
                    className="absolute top-1/2 left-1/2 rounded-full pointer-events-none"
                    style={{
                      width: particle.size,
                      height: particle.size,
                      backgroundColor: particle.color,
                      animation: `particle-explode 0.8s ease-out forwards`,
                      animationDelay: `${particle.delay}s`,
                      '--tx': `${particle.x}px`,
                      '--ty': `${particle.y}px`,
                    } as React.CSSProperties}
                  />
                ))}
            </button>

            {/* 标签文字 */}
            <p className={`
              text-xs text-center mt-2 font-medium transition-colors duration-300
              ${rating === 'dislike' ? 'text-jazz-burgundy-400' : 'text-gray-500'}
            `}>
              不喜欢
            </p>
          </div>
        </div>

        {/* 可选评论输入框 */}
        {rating && (
          <div className="space-y-3 animate-fade-in">
            {!showComment ? (
              <button
                onClick={() => setShowComment(true)}
                className="
                  w-full py-2 text-sm
                  text-deep-indigo-400 hover:text-deep-indigo-300
                  transition-colors duration-200
                "
              >
                + 添加评论（可选）
              </button>
            ) : (
              <div className="relative">
                <textarea
                  value={comment}
                  onChange={handleCommentChange}
                  placeholder="分享您的想法，帮助我们改进..."
                  maxLength={500}
                  disabled={disabled || isSubmitting}
                  className="
                    w-full px-4 py-3 rounded-xl
                    bg-white/5 border border-white/10
                    text-white placeholder-gray-500 text-sm
                    focus:outline-none focus:ring-2 focus:ring-neon-purple-500/50 focus:border-neon-purple-500/50
                    resize-none transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                  rows={3}
                />
                {/* 字符计数 */}
                <span className="absolute bottom-2 right-3 text-xs text-gray-500">
                  {comment.length}/500
                </span>
              </div>
            )}
          </div>
        )}

        {/* 提交按钮 */}
        {rating && (
          <div className="mt-6 animate-slide-up">
            <button
              onClick={handleSubmit}
              disabled={disabled || isSubmitting}
              className={`
                w-full py-3 px-6 rounded-xl
                font-medium text-white
                bg-gradient-to-r from-neon-purple-600 to-cyber-cyan-500
                shadow-lg shadow-neon-purple-500/30
                transition-all duration-300
                hover:shadow-xl hover:shadow-neon-purple-500/40 hover:scale-[1.02]
                active:scale-[0.98]
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
                flex items-center justify-center gap-2
              `}
            >
              {isSubmitting ? (
                <>
                  <Send className="w-5 h-5 animate-pulse" />
                  提交中...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  提交反馈
                </>
              )}
            </button>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="
            mt-4 p-3 rounded-xl
            bg-jazz-burgundy-500/10 border border-jazz-burgundy-500/30
            text-jazz-burgundy-300 text-sm text-center
            animate-fade-in
          ">
            {error}
          </div>
        )}
      </div>

      {/* 内联 CSS 动画 - 粒子爆炸效果 */}
      <style>{`
        @keyframes particle-explode {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(
              calc(-50% + var(--tx)),
              calc(-50% + var(--ty))
            ) scale(0);
          }
        }
      `}</style>
    </div>
  );
}

export default FeedbackButtons;
