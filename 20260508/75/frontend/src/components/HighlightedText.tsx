import { useMemo, useRef, useEffect } from 'react';
import { useAppStore } from '@/store';
import { FileText, Search, MapPin } from 'lucide-react';
import type { Keyword } from '@/types';

interface HighlightedTextProps {
  text: string;
  keywords: Keyword[];
}

interface TextSegment {
  text: string;
  isHighlighted: boolean;
  keyword?: string;
  isActive?: boolean;
}

function HighlightedText({ text, keywords }: HighlightedTextProps) {
  const { selectedKeyword } = useAppStore();
  const textContainerRef = useRef<HTMLDivElement>(null);
  const firstHighlightRef = useRef<HTMLSpanElement>(null);

  const segments = useMemo((): TextSegment[] => {
    if (!text || keywords.length === 0) {
      return [{ text, isHighlighted: false }];
    }

    const allPositions: { start: number; end: number; word: string }[] = [];
    
    keywords.forEach((keyword) => {
      keyword.positions.forEach((pos) => {
        allPositions.push({
          start: pos.start,
          end: pos.end,
          word: keyword.word,
        });
      });
    });

    allPositions.sort((a, b) => a.start - b.start);

    const mergedPositions: typeof allPositions = [];
    for (const pos of allPositions) {
      if (mergedPositions.length === 0) {
        mergedPositions.push(pos);
      } else {
        const last = mergedPositions[mergedPositions.length - 1];
        if (pos.start <= last.end) {
          if (pos.end > last.end) {
            last.end = pos.end;
          }
        } else {
          mergedPositions.push(pos);
        }
      }
    }

    const result: TextSegment[] = [];
    let currentIndex = 0;

    for (const pos of mergedPositions) {
      if (pos.start > currentIndex) {
        result.push({
          text: text.slice(currentIndex, pos.start),
          isHighlighted: false,
        });
      }

      result.push({
        text: text.slice(pos.start, pos.end),
        isHighlighted: true,
        keyword: pos.word,
        isActive: selectedKeyword === pos.word,
      });

      currentIndex = pos.end;
    }

    if (currentIndex < text.length) {
      result.push({
        text: text.slice(currentIndex),
        isHighlighted: false,
      });
    }

    return result;
  }, [text, keywords, selectedKeyword]);

  useEffect(() => {
    if (selectedKeyword && firstHighlightRef.current) {
      firstHighlightRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [selectedKeyword]);

  if (!text) {
    return (
      <div className="glass-card rounded-xl p-6 min-h-[300px] flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500">原文将在此处显示</p>
          <p className="text-slate-600 text-sm mt-1">关键词高亮功能将自动启用</p>
        </div>
      </div>
    );
  }

  const totalOccurrences = keywords.reduce((sum, k) => sum + k.positions.length, 0);
  const selectedKeywordData = keywords.find(k => k.word === selectedKeyword);

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent-400" />
          <h2 className="text-xl font-display font-semibold text-white">原文预览</h2>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <Search className="w-3 h-3" />
            <span>{keywords.length} 个关键词</span>
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            <span>{totalOccurrences} 处匹配</span>
          </div>
        </div>
      </div>

      {selectedKeywordData && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-accent-500/10 border border-accent-500/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-accent-400" />
            <span className="text-accent-300 text-sm">
              关键词 <span className="font-medium text-accent-400">"{selectedKeyword}"</span> 出现了{' '}
              <span className="font-bold text-accent-400">{selectedKeywordData.positions.length}</span> 次
            </span>
          </div>
          <span className="text-xs text-slate-500">
            权重: {selectedKeywordData.weight.toFixed(4)}
          </span>
        </div>
      )}

      <div
        ref={textContainerRef}
        className="bg-slate-800/50 rounded-lg p-5 max-h-[400px] overflow-y-auto scrollbar-thin"
      >
        <p className="text-slate-200 leading-loose text-sm whitespace-pre-wrap">
          {segments.map((segment, index) => {
            if (segment.isHighlighted) {
              const isFirstActive = segment.isActive && 
                index === segments.findIndex(s => s.isActive);
              
              return (
                <span
                  key={index}
                  ref={isFirstActive ? firstHighlightRef : undefined}
                  className={`
                    px-1 rounded transition-all duration-300 cursor-pointer
                    ${segment.isActive
                      ? 'bg-accent-400/50 text-white font-medium animate-highlight'
                      : 'bg-accent-500/30 text-accent-200 hover:bg-accent-500/50'
                    }
                    ${selectedKeyword && !segment.isActive ? 'opacity-40' : ''}
                  `}
                  title={segment.keyword}
                >
                  {segment.text}
                </span>
              );
            }
            return <span key={index}>{segment.text}</span>;
          })}
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
        <span>{text.length} 字符 · {text.trim().split(/\s+/).length} 词</span>
        <span>
          {selectedKeyword 
            ? `显示含 "${selectedKeyword}" 的内容，其他内容已淡化`
            : '关键词已高亮显示，点击上方关键词可快速定位'
          }
        </span>
      </div>
    </div>
  );
}

export default HighlightedText;
