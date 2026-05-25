import re
from typing import List, Tuple, Dict, Any


def split_sentences(text: str) -> List[str]:
    """将文本分割为句子"""
    text = text.strip()
    if not text:
        return []
    
    sentences = re.split(r'(?<=[。！？.!?])\s+', text)
    sentences = [s.strip() for s in sentences if s.strip()]
    
    if len(sentences) == 1 and len(text) > 500:
        sentences = re.split(r'[。！？.!?]', text)
        sentences = [s.strip() for s in sentences if s.strip()]
    
    return sentences


def split_paragraphs(text: str) -> List[str]:
    """将文本分割为段落"""
    paragraphs = re.split(r'\n\s*\n', text.strip())
    return [p.strip() for p in paragraphs if p.strip()]


def clean_text(text: str) -> str:
    """清理文本"""
    if not text:
        return ""
    
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[\x00-\x1F\x7F-\x9F]', '', text)
    text = text.strip()
    
    return text


def find_keyword_positions(text: str, keyword: str, case_sensitive: bool = False) -> List[Dict[str, int]]:
    """查找关键词在原文中的所有位置"""
    positions = []
    
    if not text or not keyword:
        return positions
    
    search_text = text if case_sensitive else text.lower()
    search_keyword = keyword if case_sensitive else keyword.lower()
    
    start = 0
    while True:
        pos = search_text.find(search_keyword, start)
        if pos == -1:
            break
        positions.append({
            'start': pos,
            'end': pos + len(keyword)
        })
        start = pos + 1
    
    return positions


def get_word_frequencies(text: str) -> Dict[str, int]:
    """获取词频统计"""
    words = re.findall(r'[\w\u4e00-\u9fff]+', text.lower())
    freq = {}
    for word in words:
        if len(word) > 1:
            freq[word] = freq.get(word, 0) + 1
    return freq


def calculate_text_stats(text: str) -> Dict[str, Any]:
    """计算文本统计信息"""
    if not text:
        return {
            'char_count': 0,
            'word_count': 0,
            'sentence_count': 0,
            'paragraph_count': 0,
            'avg_word_length': 0,
            'avg_sentence_length': 0
        }
    
    char_count = len(text)
    words = re.findall(r'[\w\u4e00-\u9fff]+', text)
    word_count = len(words)
    sentences = split_sentences(text)
    sentence_count = len(sentences)
    paragraphs = split_paragraphs(text)
    paragraph_count = len(paragraphs)
    
    avg_word_length = sum(len(w) for w in words) / word_count if word_count > 0 else 0
    avg_sentence_length = word_count / sentence_count if sentence_count > 0 else 0
    
    return {
        'char_count': char_count,
        'word_count': word_count,
        'sentence_count': sentence_count,
        'paragraph_count': paragraph_count,
        'avg_word_length': round(avg_word_length, 2),
        'avg_sentence_length': round(avg_sentence_length, 2)
    }


def is_chinese_text(text: str) -> bool:
    """判断是否主要是中文文本"""
    if not text:
        return False
    
    chinese_chars = len(re.findall(r'[\u4e00-\u9fff]', text))
    total_chars = len(text)
    
    return chinese_chars / total_chars > 0.3 if total_chars > 0 else False


def truncate_text(text: str, max_length: int, suffix: str = '...') -> str:
    """截断文本"""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)] + suffix
