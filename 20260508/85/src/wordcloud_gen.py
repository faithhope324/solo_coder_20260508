import jieba
import os
import re
from collections import Counter
from wordcloud import WordCloud
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.colors as mcolors
import numpy as np
from PIL import Image
import time

STOPWORDS_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'stopwords.txt')
OUTPUT_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'static', 'images')

CUSTOM_WORDS = [
    '味道好', '味道棒', '味道不错', '味道一般', '味道差',
    '服务好', '服务态度好', '服务周到', '服务热情', '服务差',
    '上菜快', '上菜慢', '等太久', '等餐慢', '速度快', '速度慢',
    '价格便宜', '价格贵', '性价比高', '性价比低',
    '环境好', '环境不错', '环境差', '干净卫生',
    '推荐', '不推荐', '下次再来', '不会再来',
    '菜品精致', '菜品新鲜', '口味正宗', '口味独特'
]

def load_stopwords(filepath=None):
    if filepath is None:
        filepath = STOPWORDS_PATH
    
    stopwords = set()
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            for line in f:
                word = line.strip()
                if word:
                    stopwords.add(word)
    
    default_stopwords = {
        ' ', '\n', '\t', '\r', '，', '。', '！', '？', '、', '；', '：',
        '“', '”', '‘', '’', '（', '）', '《', '》', '【', '】',
        ',', '.', '!', '?', ';', ':', '"', "'", '(', ')', '<', '>',
        '[', ']', '{', '}', '/', '\\', '|', '-', '_', '=', '+',
        '*', '&', '^', '%', '$', '#', '@', '!', '~', '`'
    }
    stopwords.update(default_stopwords)
    
    return stopwords

def init_jieba():
    for word in CUSTOM_WORDS:
        jieba.add_word(word, freq=1000)

def preprocess_text(text_series, stopwords=None):
    if stopwords is None:
        stopwords = load_stopwords()
    
    init_jieba()
    
    all_words = []
    word_comments = {}
    
    for idx, text in enumerate(text_series):
        if not isinstance(text, str) or not text.strip():
            continue
        
        text = re.sub(r'[^\u4e00-\u9fa5a-zA-Z0-9]', ' ', text)
        
        words = jieba.lcut(text, cut_all=False)
        
        for word in words:
            word = word.strip()
            if len(word) < 2:
                continue
            if word in stopwords:
                continue
            if re.match(r'^[0-9]+$', word):
                continue
            
            all_words.append(word)
            
            if word not in word_comments:
                word_comments[word] = []
            if len(word_comments[word]) < 5:
                word_comments[word].append(text)
    
    return all_words, word_comments

def calculate_word_frequency(words_list, top_n=100):
    if not words_list:
        return []
    
    word_counter = Counter(words_list)
    most_common = word_counter.most_common(top_n)
    
    result = []
    for word, count in most_common:
        result.append({
            'name': word,
            'value': int(count)
        })
    
    return result

def generate_wordcloud_image(word_freq, output_path=None, width=800, height=500):
    if not word_freq:
        return None
    
    if output_path is None:
        timestamp = int(time.time())
        filename = f'wordcloud_{timestamp}.png'
        output_path = os.path.join(OUTPUT_DIR, filename)
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    word_dict = {}
    for item in word_freq:
        try:
            word_dict[str(item['name'])] = int(item['value'])
        except (ValueError, TypeError):
            continue
    
    if not word_dict:
        return None
    
    colors = [
        '#FF6B35', '#FF8C42', '#FFD166', '#06D6A0', '#118AB2',
        '#073B4C', '#EF476F', '#7B2D26', '#8A4F7D', '#5B8C5A'
    ]
    
    def color_func(word, font_size, position, orientation, random_state=None, **kwargs):
        import random as rnd
        return rnd.choice(colors)
    
    font_path = None
    possible_fonts = [
        'C:/Windows/Fonts/simhei.ttf',
        'C:/Windows/Fonts/msyh.ttc',
        'C:/Windows/Fonts/simkai.ttf',
        '/usr/share/fonts/truetype/wqy/wqy-microhei.ttc',
        '/System/Library/Fonts/PingFang.ttc',
        '/System/Library/Fonts/STHeiti Light.ttc'
    ]
    for font in possible_fonts:
        if os.path.exists(font):
            font_path = font
            break
    
    try:
        wordcloud = WordCloud(
            width=width,
            height=height,
            background_color='white',
            font_path=font_path,
            max_words=100,
            max_font_size=80,
            min_font_size=12,
            relative_scaling=0.6,
            color_func=color_func,
            prefer_horizontal=0.7,
            margin=10,
            collocations=False
        )
        
        wordcloud.generate_from_frequencies(word_dict)
        
        fig, ax = plt.subplots(figsize=(width/100, height/100), dpi=100)
        ax.imshow(wordcloud, interpolation='bilinear')
        ax.axis('off')
        
        plt.tight_layout(pad=0)
        plt.savefig(output_path, format='png', bbox_inches='tight', pad_inches=0, dpi=100)
        plt.close(fig)
        
        print(f"词云图片已生成: {output_path}")
        return output_path
    
    except Exception as e:
        print(f"生成词云图片失败: {str(e)}")
        import traceback
        traceback.print_exc()
        return None

def get_wordcloud_analysis(text_series, top_n=100):
    stopwords = load_stopwords()
    all_words, word_comments = preprocess_text(text_series, stopwords)
    word_freq = calculate_word_frequency(all_words, top_n)
    image_path = generate_wordcloud_image(word_freq)
    
    image_url = None
    if image_path:
        image_filename = os.path.basename(image_path)
        image_url = f'/static/images/{image_filename}'
    
    for item in word_freq:
        item['comments'] = word_comments.get(item['name'], [])
    
    return {
        'image_url': image_url,
        'word_list': word_freq[:top_n],
        'total_words': len(all_words),
        'unique_words': len(set(all_words))
    }
