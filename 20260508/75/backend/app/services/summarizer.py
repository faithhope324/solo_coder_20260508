import time
import re
from typing import List, Dict, Any, Tuple
from app.utils.text_processor import split_sentences, is_chinese_text

TRANSFORMERS_AVAILABLE = False
try:
    from transformers import pipeline, AutoTokenizer, AutoModelForSeq2SeqLM
    import torch
    TRANSFORMERS_AVAILABLE = True
except ImportError:
    TRANSFORMERS_AVAILABLE = False


LENGTH_CONFIG = {
    'short': {'ratio': 0.1, 'min': 50, 'max': 150},
    'medium': {'ratio': 0.2, 'min': 100, 'max': 300},
    'long': {'ratio': 0.3, 'min': 200, 'max': 500}
}


class AbstractSummarizer:
    """抽象基类：摘要生成器"""
    
    def summarize(self, text: str, length: str = 'medium') -> str:
        raise NotImplementedError
    
    def get_name(self) -> str:
        raise NotImplementedError


class HeuristicSummarizer(AbstractSummarizer):
    """启发式摘要生成器（当模型不可用时的回退方案）"""
    
    def __init__(self):
        self.name = 'heuristic'
    
    def get_name(self) -> str:
        return self.name
    
    def _score_sentence(self, sentence: str, idx: int, total_sentences: int, word_freq: Dict[str, int]) -> float:
        """计算句子重要性得分"""
        score = 0.0
        words = re.findall(r'[\w\u4e00-\u9fff]+', sentence.lower())
        
        for word in words:
            if word in word_freq:
                score += word_freq[word]
        
        position_bonus = 0.0
        if total_sentences > 0:
            if idx == 0:
                position_bonus = 1.5
            elif idx < total_sentences * 0.3:
                position_bonus = 1.2
            elif idx > total_sentences * 0.7:
                position_bonus = 1.1
        
        length_factor = min(len(words) / 20.0, 1.0)
        return score * position_bonus * length_factor
    
    def _get_word_frequencies(self, text: str) -> Dict[str, int]:
        """获取词频"""
        words = re.findall(r'[\w\u4e00-\u9fff]+', text.lower())
        freq = {}
        for word in words:
            if len(word) > 1:
                freq[word] = freq.get(word, 0) + 1
        return freq
    
    def summarize(self, text: str, length: str = 'medium') -> str:
        """使用启发式方法生成摘要"""
        sentences = split_sentences(text)
        
        if len(sentences) <= 2:
            return text
        
        config = LENGTH_CONFIG.get(length, LENGTH_CONFIG['medium'])
        target_ratio = config['ratio']
        
        num_sentences = max(2, int(len(sentences) * target_ratio))
        num_sentences = min(num_sentences, len(sentences))
        
        word_freq = self._get_word_frequencies(text)
        total_sentences = len(sentences)
        
        scored_sentences = []
        for idx, sentence in enumerate(sentences):
            score = self._score_sentence(sentence, idx, total_sentences, word_freq)
            scored_sentences.append((sentence, score, idx))
        
        scored_sentences.sort(key=lambda x: x[1], reverse=True)
        top_sentences = scored_sentences[:num_sentences]
        
        top_sentences.sort(key=lambda x: x[2])
        
        summary = ' '.join([s[0] for s in top_sentences])
        
        return summary.strip()


class BARTSummarizer(AbstractSummarizer):
    """BART摘要生成器"""
    
    def __init__(self):
        self.name = 'bart'
        self.model_name = 'facebook/bart-large-cnn'
        self.pipeline = None
        self._initialized = False
    
    def get_name(self) -> str:
        return self.name
    
    def _initialize(self):
        """延迟初始化模型"""
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError("transformers库未安装")
        
        if not self._initialized:
            print(f"正在加载BART模型: {self.model_name}...")
            self.pipeline = pipeline(
                "summarization",
                model=self.model_name,
                device=-1
            )
            self._initialized = True
    
    def summarize(self, text: str, length: str = 'medium') -> str:
        """使用BART生成摘要"""
        if not TRANSFORMERS_AVAILABLE:
            return HeuristicSummarizer().summarize(text, length)
        
        try:
            self._initialize()
            
            config = LENGTH_CONFIG.get(length, LENGTH_CONFIG['medium'])
            
            max_length = min(config['max'], int(len(text) * config['ratio'] * 1.5))
            min_length = min(config['min'], int(len(text) * config['ratio'] * 0.5))
            
            max_length = max(min_length + 50, max_length)
            
            result = self.pipeline(
                text,
                max_length=max_length,
                min_length=min_length,
                do_sample=False,
                truncation=True
            )
            
            return result[0]['summary_text'].strip()
            
        except Exception as e:
            print(f"BART摘要生成失败，使用启发式方法: {e}")
            return HeuristicSummarizer().summarize(text, length)


class T5Summarizer(AbstractSummarizer):
    """T5摘要生成器"""
    
    def __init__(self):
        self.name = 't5'
        self.model_name = 't5-base'
        self.pipeline = None
        self._initialized = False
    
    def get_name(self) -> str:
        return self.name
    
    def _initialize(self):
        """延迟初始化模型"""
        if not TRANSFORMERS_AVAILABLE:
            raise ImportError("transformers库未安装")
        
        if not self._initialized:
            print(f"正在加载T5模型: {self.model_name}...")
            self.pipeline = pipeline(
                "summarization",
                model=self.model_name,
                device=-1
            )
            self._initialized = True
    
    def summarize(self, text: str, length: str = 'medium') -> str:
        """使用T5生成摘要"""
        if not TRANSFORMERS_AVAILABLE:
            return HeuristicSummarizer().summarize(text, length)
        
        try:
            self._initialize()
            
            config = LENGTH_CONFIG.get(length, LENGTH_CONFIG['medium'])
            
            max_length = min(config['max'], int(len(text) * config['ratio'] * 1.5))
            min_length = min(config['min'], int(len(text) * config['ratio'] * 0.5))
            
            max_length = max(min_length + 50, max_length)
            
            input_text = f"summarize: {text}"
            
            result = self.pipeline(
                input_text,
                max_length=max_length,
                min_length=min_length,
                do_sample=False,
                truncation=True
            )
            
            return result[0]['summary_text'].strip()
            
        except Exception as e:
            print(f"T5摘要生成失败，使用启发式方法: {e}")
            return HeuristicSummarizer().summarize(text, length)


class SummarizationService:
    """摘要生成服务"""
    
    def __init__(self):
        self.summarizers = {
            'bart': BARTSummarizer(),
            't5': T5Summarizer(),
            'heuristic': HeuristicSummarizer()
        }
    
    def summarize(self, text: str, models: List[str], 
                   length: str = 'medium') -> List[Dict[str, Any]]:
        """
        使用多个模型生成摘要
        
        Args:
            text: 输入文本
            models: 模型名称列表 ['bart', 't5']
            length: 摘要长度 'short' | 'medium' | 'long'
        
        Returns:
            摘要结果列表，每个元素包含 model, summary, processingTime
        """
        if not text.strip():
            raise ValueError("输入文本不能为空")
        
        results = []
        
        for model_name in models:
            model = self.summarizers.get(model_name.lower())
            
            if model is None:
                print(f"未知的摘要模型: {model_name}，使用启发式方法")
                model = self.summarizers['heuristic']
                model_name = 'heuristic'
            
            start_time = time.time()
            
            try:
                summary = model.summarize(text, length)
                processing_time = time.time() - start_time
                
                results.append({
                    'model': model.get_name(),
                    'summary': summary,
                    'processingTime': round(processing_time, 3)
                })
            except Exception as e:
                print(f"模型 {model_name} 摘要生成失败: {e}")
                heuristic = self.summarizers['heuristic']
                start_time = time.time()
                summary = heuristic.summarize(text, length)
                processing_time = time.time() - start_time
                
                results.append({
                    'model': f'{model_name}_fallback',
                    'summary': summary,
                    'processingTime': round(processing_time, 3)
                })
        
        return results
    
    def get_available_models(self) -> List[str]:
        """获取可用的模型列表"""
        models = []
        for name, summarizer in self.summarizers.items():
            if name != 'heuristic':
                models.append({
                    'name': name,
                    'available': TRANSFORMERS_AVAILABLE if name in ['bart', 't5'] else True
                })
        return models


summarization_service = SummarizationService()


def generate_summaries(text: str, models: List[str], 
                       length: str = 'medium') -> List[Dict[str, Any]]:
    """便捷函数：生成摘要"""
    return summarization_service.summarize(text, models, length)
