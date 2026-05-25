import re
import time
from typing import List, Dict, Any, Tuple
from collections import Counter
from app.utils.text_processor import find_keyword_positions

SKLEARN_AVAILABLE = False
try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

NLTK_AVAILABLE = False
try:
    import nltk
    from nltk.corpus import stopwords
    NLTK_AVAILABLE = True
    try:
        stopwords.words('english')
    except LookupError:
        nltk.download('stopwords', quiet=True)
        nltk.download('punkt', quiet=True)
except ImportError:
    NLTK_AVAILABLE = False


DEFAULT_STOPWORDS = {
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'can', 'shall', 'this',
    'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their', 'we',
    'us', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'i',
    'me', 'my', 'not', 'no', 'nor', 'so', 'yet', 'also', 'too', 'very',
    'just', 'about', 'also', 'more', 'most', 'some', 'any', 'such', 'all',
    'each', 'every', 'both', 'few', 'many', 'own', 'same', 'than', 'too',
    'very', 's', 't', 'don', 'now', 'here', 'there', 'when', 'where',
    'why', 'how', 'which', 'who', 'whom', 'whose', 'what', 'if', 'then',
    'else', 'up', 'down', 'out', 'over', 'under', 'again', 'further',
    'the', '和', '与', '及', '或', '而', '但', '在', '于', '到', '向',
    '对', '给', '从', '以', '用', '为', '的', '地', '得', '是', '在',
    '了', '着', '过', '被', '把', '让', '给', '使', '这', '那', '这些',
    '那些', '它', '它们', '他', '他们', '她', '她们', '你', '你们',
    '我', '我们', '不', '没', '有', '也', '就', '都', '还', '又', '再',
    '很', '更', '最', '只', '能', '会', '要', '可', '以', '一个', '一些',
    '一种', '什么', '怎么', '为什么', '如何', '哪里', '那个', '这个',
    '进行', '通过', '基于', '由于', '因此', '所以', '然后', '然而',
    '虽然', '但是', '如果', '因为', '所以', '并且', '或者', '还是'
}


class RAKEKeywordExtractor:
    """RAKE关键词提取算法"""
    
    def __init__(self):
        self.name = 'rake'
        self.stopwords = self._load_stopwords()
    
    def _load_stopwords(self) -> set:
        """加载停用词"""
        stopwords_set = set(DEFAULT_STOPWORDS)
        
        if NLTK_AVAILABLE:
            try:
                stopwords_set.update(stopwords.words('english'))
            except:
                pass
        
        return stopwords_set
    
    def _split_sentences(self, text: str) -> List[str]:
        """分割句子"""
        return re.split(r'[.!?。！？,，;；:：\n]', text)
    
    def _is_stopword(self, word: str) -> bool:
        """判断是否为停用词"""
        return word.lower() in self.stopwords or len(word) < 2
    
    def _generate_candidate_keywords(self, text: str) -> List[str]:
        """生成候选关键词"""
        sentences = self._split_sentences(text)
        candidates = []
        
        for sentence in sentences:
            phrase = []
            words = re.findall(r'[\w\u4e00-\u9fff]+', sentence)
            
            for word in words:
                if self._is_stopword(word):
                    if phrase:
                        candidates.append(' '.join(phrase))
                        phrase = []
                else:
                    phrase.append(word)
            
            if phrase:
                candidates.append(' '.join(phrase))
        
        return candidates
    
    def _calculate_word_scores(self, candidates: List[str]) -> Dict[str, float]:
        """计算单词得分"""
        word_freq = Counter()
        word_degree = Counter()
        
        for candidate in candidates:
            words = candidate.split()
            word_count = len(words)
            
            for word in words:
                word_freq[word] += 1
                word_degree[word] += word_count
        
        word_scores = {}
        for word in word_freq:
            if word_freq[word] > 0:
                word_scores[word] = word_degree[word] / word_freq[word]
        
        return word_scores
    
    def _calculate_phrase_scores(self, candidates: List[str], 
                                word_scores: Dict[str, float]) -> Dict[str, float]:
        """计算短语得分"""
        phrase_scores = {}
        
        for candidate in candidates:
            score = 0.0
            words = candidate.split()
            
            for word in words:
                score += word_scores.get(word, 0)
            
            if candidate not in phrase_scores or score > phrase_scores[candidate]:
                phrase_scores[candidate] = score
        
        return phrase_scores
    
    def extract(self, text: str, max_keywords: int = 20) -> List[Dict[str, Any]]:
        """提取关键词"""
        if not text.strip():
            return []
        
        candidates = self._generate_candidate_keywords(text)
        word_scores = self._calculate_word_scores(candidates)
        phrase_scores = self._calculate_phrase_scores(candidates, word_scores)
        
        sorted_phrases = sorted(phrase_scores.items(), key=lambda x: x[1], reverse=True)
        
        max_score = max((s for _, s in sorted_phrases), default=1.0)
        
        results = []
        seen = set()
        
        for phrase, score in sorted_phrases:
            normalized_phrase = phrase.lower().strip()
            
            if normalized_phrase in seen or not normalized_phrase:
                continue
            
            seen.add(normalized_phrase)
            
            positions = find_keyword_positions(text, phrase)
            
            if positions:
                results.append({
                    'word': phrase,
                    'weight': round(score / max_score, 4) if max_score > 0 else 0,
                    'positions': positions
                })
            
            if len(results) >= max_keywords:
                break
        
        return results


class TFIDFKeywordExtractor:
    """TF-IDF关键词提取算法"""
    
    def __init__(self):
        self.name = 'tfidf'
        self.stopwords = self._load_stopwords()
    
    def _load_stopwords(self) -> set:
        """加载停用词"""
        stopwords_set = set(DEFAULT_STOPWORDS)
        
        if NLTK_AVAILABLE:
            try:
                stopwords_set.update(stopwords.words('english'))
            except:
                pass
        
        return stopwords_set
    
    def _tokenize(self, text: str) -> List[str]:
        """分词"""
        words = re.findall(r'[\w\u4e00-\u9fff]+', text.lower())
        return [w for w in words if w not in self.stopwords and len(w) > 1]
    
    def _extract_with_sklearn(self, text: str, max_keywords: int) -> List[Dict[str, Any]]:
        """使用scikit-learn的TF-IDF"""
        documents = [text]
        
        vectorizer = TfidfVectorizer(
            max_features=max_keywords * 2,
            stop_words='english',
            ngram_range=(1, 2),
            token_pattern=r'[\w\u4e00-\u9fff]+'
        )
        
        tfidf_matrix = vectorizer.fit_transform(documents)
        feature_names = vectorizer.get_feature_names_out()
        
        scores = tfidf_matrix.toarray()[0]
        
        keyword_scores = []
        for word, score in zip(feature_names, scores):
            if score > 0 and word not in self.stopwords:
                keyword_scores.append((word, score))
        
        keyword_scores.sort(key=lambda x: x[1], reverse=True)
        
        max_score = max((s for _, s in keyword_scores), default=1.0)
        
        results = []
        for word, score in keyword_scores[:max_keywords]:
            positions = find_keyword_positions(text, word)
            if positions:
                results.append({
                    'word': word,
                    'weight': round(score / max_score, 4) if max_score > 0 else 0,
                    'positions': positions
                })
        
        return results
    
    def _extract_simple(self, text: str, max_keywords: int) -> List[Dict[str, Any]]:
        """简单的TF-IDF实现（当scikit-learn不可用时）"""
        sentences = re.split(r'[.!?。！？\n]', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        
        if not sentences:
            return []
        
        doc_count = len(sentences)
        
        word_doc_freq = Counter()
        word_term_freq = Counter()
        
        for sentence in sentences:
            words = self._tokenize(sentence)
            unique_words = set(words)
            
            for word in unique_words:
                word_doc_freq[word] += 1
            
            for word in words:
                word_term_freq[word] += 1
        
        word_tfidf = {}
        for word in word_term_freq:
            tf = word_term_freq[word]
            df = word_doc_freq[word]
            idf = (doc_count / (df + 1)) + 1
            word_tfidf[word] = tf * idf
        
        sorted_words = sorted(word_tfidf.items(), key=lambda x: x[1], reverse=True)
        max_score = max((s for _, s in sorted_words), default=1.0)
        
        results = []
        for word, score in sorted_words[:max_keywords]:
            positions = find_keyword_positions(text, word)
            if positions:
                results.append({
                    'word': word,
                    'weight': round(score / max_score, 4) if max_score > 0 else 0,
                    'positions': positions
                })
        
        return results
    
    def extract(self, text: str, max_keywords: int = 20) -> List[Dict[str, Any]]:
        """提取关键词"""
        if not text.strip():
            return []
        
        if SKLEARN_AVAILABLE:
            try:
                return self._extract_with_sklearn(text, max_keywords)
            except Exception as e:
                print(f"scikit-learn TF-IDF提取失败，使用简单实现: {e}")
        
        return self._extract_simple(text, max_keywords)


class KeywordExtractionService:
    """关键词提取服务"""
    
    def __init__(self):
        self.extractors = {
            'rake': RAKEKeywordExtractor(),
            'tfidf': TFIDFKeywordExtractor()
        }
    
    def extract(self, text: str, algorithm: str = 'rake',
                max_keywords: int = 20) -> Dict[str, Any]:
        """
        提取关键词
        
        Args:
            text: 输入文本
            algorithm: 算法名称 'rake' | 'tfidf'
            max_keywords: 最大关键词数量
        
        Returns:
            包含关键词和算法信息的字典
        """
        if not text.strip():
            raise ValueError("输入文本不能为空")
        
        extractor = self.extractors.get(algorithm.lower())
        
        if extractor is None:
            print(f"未知的关键词算法: {algorithm}，使用RAKE")
            extractor = self.extractors['rake']
            algorithm = 'rake'
        
        start_time = time.time()
        
        try:
            keywords = extractor.extract(text, max_keywords)
        except Exception as e:
            print(f"关键词提取失败: {e}")
            keywords = []
        
        processing_time = time.time() - start_time
        
        return {
            'keywords': keywords,
            'algorithm': algorithm,
            'processingTime': round(processing_time, 3)
        }
    
    def get_available_algorithms(self) -> List[str]:
        """获取可用的算法列表"""
        algorithms = []
        for name, extractor in self.extractors.items():
            if name == 'tfidf':
                available = SKLEARN_AVAILABLE
            else:
                available = True
            
            algorithms.append({
                'name': name,
                'available': available
            })
        return algorithms


keyword_extraction_service = KeywordExtractionService()


def extract_keywords(text: str, algorithm: str = 'rake',
                     max_keywords: int = 20) -> Dict[str, Any]:
    """便捷函数：提取关键词"""
    return keyword_extraction_service.extract(text, algorithm, max_keywords)
