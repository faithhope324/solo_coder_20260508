import { useCallback, useState } from 'react';
import { useAppStore } from '@/store';
import { analyzeText, uploadPDF } from '@/services/api';
import TextInput from '@/components/TextInput';
import PDFUpload from '@/components/PDFUpload';
import ModelSelector from '@/components/ModelSelector';
import SummaryTabs from '@/components/SummaryTabs';
import KeywordCloud from '@/components/KeywordCloud';
import HighlightedText from '@/components/HighlightedText';
import { FileText, Sparkles, Loader2, AlertCircle } from 'lucide-react';

function App() {
  const {
    originalText,
    isAnalyzing,
    summaries,
    keywords,
    selectedModels,
    selectedAlgorithm,
    summaryLength,
    maxKeywords,
    error,
    setOriginalText,
    setAnalyzing,
    setSummaries,
    setKeywords,
    setFileName,
    setError,
    resetResults,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'input' | 'result'>('input');

  const handleAnalyze = useCallback(async () => {
    if (!originalText.trim()) {
      setError('请输入文本或上传PDF文件');
      return;
    }

    setError(null);
    setAnalyzing(true);
    resetResults();

    try {
      const response = await analyzeText({
        text: originalText,
        summaryModels: selectedModels,
        keywordAlgorithm: selectedAlgorithm,
        summaryLength,
        maxKeywords,
      });

      if (response.success) {
        setSummaries(response.summaries);
        setKeywords(response.keywords);
        setActiveTab('result');
      } else {
        setError('分析失败，请重试');
      }
    } catch (err) {
      setError('网络错误，请检查后端服务是否启动');
      console.error('Analysis error:', err);
    } finally {
      setAnalyzing(false);
    }
  }, [originalText, selectedModels, selectedAlgorithm, summaryLength, maxKeywords, setAnalyzing, setSummaries, setKeywords, setError, resetResults]);

  const handlePDFUpload = useCallback(async (file: File) => {
    setError(null);
    setAnalyzing(true);

    try {
      const response = await uploadPDF(file);
      if (response.success) {
        setOriginalText(response.text);
        setFileName(response.fileName);
        
        setTimeout(async () => {
          try {
            const analyzeResponse = await analyzeText({
              text: response.text,
              summaryModels: selectedModels,
              keywordAlgorithm: selectedAlgorithm,
              summaryLength,
              maxKeywords,
            });

            if (analyzeResponse.success) {
              setSummaries(analyzeResponse.summaries);
              setKeywords(analyzeResponse.keywords);
              setActiveTab('result');
            } else {
              setError('分析失败，请重试');
              setActiveTab('input');
            }
          } catch (err) {
            setError('分析失败，请检查后端服务是否启动');
            console.error('Auto-analysis error:', err);
            setActiveTab('input');
          } finally {
            setAnalyzing(false);
          }
        }, 500);
      } else {
        setError('PDF解析失败，请检查文件是否有效');
        setAnalyzing(false);
      }
    } catch (err) {
      setError('PDF上传失败，请检查后端服务是否启动');
      console.error('PDF upload error:', err);
      setAnalyzing(false);
    }
  }, [selectedModels, selectedAlgorithm, summaryLength, maxKeywords, setOriginalText, setFileName, setAnalyzing, setSummaries, setKeywords, setError]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-noise pointer-events-none" />
      
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
        <header className="text-center mb-10 animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 glow">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-display font-bold text-gradient">
              文本摘要与关键词提取
            </h1>
          </div>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            基于 BART 和 T5 模型的智能文本分析，支持 PDF 解析、多模型摘要对比、关键词云可视化
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-300">{error}</span>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('input')}
            className={`tab-btn ${activeTab === 'input' ? 'active' : ''}`}
          >
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              文本输入
            </span>
          </button>
          <button
            onClick={() => setActiveTab('result')}
            className={`tab-btn ${activeTab === 'result' ? 'active' : ''}`}
            disabled={summaries.length === 0 && keywords.length === 0}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              分析结果
            </span>
          </button>
        </div>

        {activeTab === 'input' && (
          <div className="space-y-6 animate-slide-up">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TextInput />
              <PDFUpload onFileUpload={handlePDFUpload} />
            </div>

            <ModelSelector />

            <div className="flex justify-center">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !originalText.trim()}
                className="btn-primary text-white text-lg px-8 py-3 flex items-center gap-3"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    正在分析中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    开始分析
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'result' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SummaryTabs summaries={summaries} />
              <KeywordCloud />
            </div>
            <HighlightedText text={originalText} keywords={keywords} />
          </div>
        )}

        <footer className="mt-12 text-center text-slate-500 text-sm">
          <p>支持 BART / T5 摘要模型 · RAKE / TF-IDF 关键词提取 · PDF 文本解析</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
