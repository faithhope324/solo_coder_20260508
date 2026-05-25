import { useAppStore } from '@/store';
import { FileText, X } from 'lucide-react';

const SAMPLE_TEXT = `人工智能（Artificial Intelligence，AI）是计算机科学的一个分支，它企图了解智能的实质，并生产出一种新的能以人类智能相似的方式做出反应的智能机器。该领域的研究包括机器人、语言识别、图像识别、自然语言处理和专家系统等。

人工智能从诞生以来，理论和技术日益成熟，应用领域也不断扩大。可以设想，未来人工智能带来的科技产品，将会是人类智慧的"容器"。人工智能可以对人的意识、思维的信息过程的模拟。人工智能不是人的智能，但能像人那样思考、也可能超过人的智能。

机器学习是人工智能的一个子集，它使计算机能够从数据中学习并改进性能，而无需进行明确的编程。深度学习是机器学习的一个子集，它使用多层神经网络来学习复杂的模式。这些技术已经在图像识别、语音识别、自然语言处理等领域取得了重大突破。

近年来，大型语言模型（Large Language Models，LLMs）如GPT系列、BERT、T5等取得了显著进展。这些模型通过在大规模文本语料上进行预训练，能够生成连贯、有意义的文本，并在各种自然语言处理任务中表现出色。

文本摘要和关键词提取是自然语言处理中的重要任务。文本摘要旨在从长文本中提取核心信息，生成简洁的摘要。关键词提取则是从文本中识别出最能代表文档主题的词语或短语。这些技术在信息检索、文档管理、内容分析等领域有着广泛的应用。`;

function TextInput() {
  const { originalText, fileName, setOriginalText, setFileName } = useAppStore();

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setOriginalText(e.target.value);
    if (fileName) setFileName(null);
  };

  const handleClear = () => {
    setOriginalText('');
    setFileName(null);
  };

  const handleLoadSample = () => {
    setOriginalText(SAMPLE_TEXT);
    setFileName(null);
  };

  const wordCount = originalText.trim() ? originalText.trim().split(/\s+/).length : 0;
  const charCount = originalText.length;

  return (
    <div className="glass-card rounded-xl p-6 relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-accent-400" />
          <h2 className="text-xl font-display font-semibold text-white">文本输入</h2>
        </div>
        <div className="flex items-center gap-2">
          {originalText && (
            <button
              onClick={handleClear}
              className="p-1.5 rounded-lg hover:bg-slate-700/50 transition-colors"
              title="清空文本"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {fileName && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-accent-500/10 border border-accent-500/30 text-sm text-accent-300 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span>已解析文件：{fileName}</span>
          <button
            onClick={handleClear}
            className="ml-auto text-xs text-slate-400 hover:text-slate-200"
          >
            清除
          </button>
        </div>
      )}

      <textarea
        value={originalText}
        onChange={handleChange}
        placeholder="在此粘贴或输入需要分析的长文本..."
        className="input-field min-h-[280px] resize-none font-sans text-sm leading-relaxed"
      />

      <div className="flex items-center justify-between mt-3 text-sm">
        <div className="text-slate-400">
          <span>{charCount} 字符</span>
          <span className="mx-2">·</span>
          <span>{wordCount} 词</span>
        </div>
        <button
          onClick={handleLoadSample}
          className="text-accent-400 hover:text-accent-300 transition-colors"
        >
          加载示例文本
        </button>
      </div>
    </div>
  );
}

export default TextInput;
