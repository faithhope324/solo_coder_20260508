import os
import re
import pickle
import numpy as np
from flask import Flask, render_template, request, jsonify
import torch
import torch.nn as nn

app = Flask(__name__)

MODEL_PATH = 'models/sentiment_rnn.pth'
META_PATH = 'models/word_index.pkl'
HISTORY_PATH = 'models/training_history.pkl'

model = None
word_to_idx = None
max_len = None
vocab_size = None
training_history = None
device = torch.device('cpu')

POS_WORDS = {
    'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
    'love', 'enjoy', 'best', 'beautiful', 'perfect', 'brilliant',
    'happy', 'fun', 'exciting', 'outstanding', 'superb', 'awesome',
    'nice', 'pleasant', 'enjoyable', 'interesting', 'fascinating',
    'compelling', 'touching', 'moving', 'liked', 'impressive',
    '好', '棒', '赞', '优秀', '出色', '精彩', '完美',
    '喜欢', '爱', '超爱', '享受', '满意', '开心', '高兴',
    '快乐', '有趣', '激动', '感动', '震撼', '惊喜',
    '美丽', '漂亮', '好看', '精彩绝伦', '引人入胜',
    '不错', '很棒', '非常好', '太好了', '绝了', '牛',
    '推荐', '值得', '回味', '难忘', '经典', '力作',
    '用心', '诚意', '良心', '突破', '创新', '诚意满满',
    '超好', '太棒了', '太赞', '真赞', '极好', '绝佳',
    '赞爆', '爱了', '太好看', '超好看', '超棒', '很赞'
}

NEG_WORDS = {
    'bad', 'terrible', 'awful', 'horrible', 'worst', 'poor',
    'hate', 'dislike', 'boring', 'dull', 'disappointing', 'waste',
    'disappointed', 'sad', 'angry', 'frustrating', 'annoying',
    'pathetic', 'ridiculous', 'stupid', 'dreadful', 'lousy', 'dreadful',
    'abysmal', 'appalling', 'atrocious', 'deplorable', 'ghastly',
    '烂', '差', '讨厌', '垃圾', '无聊', '糟糕', '失望',
    '厌恶', '烦人', '讨厌', '恶心', '垃圾', '失望',
    '浪费', '坑爹', '烂片', '难看', '差评', '失败',
    '无语', '垃圾', '太烂', '差劲', '糟糕透顶', '烂到家',
    '不忍直视', '浪费时间', '浪费钱', '不值', '坑爹',
    '看不下去', '无聊透顶', '极差', '烂爆', '垃圾片', '烂戏'
}


class RNNClassifier(nn.Module):
    def __init__(self, vocab_size, embedding_dim, hidden_dim, output_dim, pad_idx):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim, padding_idx=pad_idx)
        self.rnn = nn.RNN(embedding_dim, hidden_dim, batch_first=True)
        self.fc1 = nn.Linear(hidden_dim, 32)
        self.dropout = nn.Dropout(0.5)
        self.fc2 = nn.Linear(32, output_dim)
    
    def forward(self, x):
        x = self.embedding(x)
        output, hidden = self.rnn(x)
        hidden = hidden.squeeze(0)
        x = self.dropout(hidden)
        x = torch.relu(self.fc1(x))
        x = self.dropout(x)
        return torch.sigmoid(self.fc2(x))


def load_resources():
    global model, word_to_idx, max_len, vocab_size, training_history
    
    if os.path.exists(MODEL_PATH) and os.path.exists(META_PATH):
        with open(META_PATH, 'rb') as f:
            meta = pickle.load(f)
            word_to_idx = meta['word_to_idx']
            max_len = meta['max_len']
            vocab_size = meta['vocab_size']
            pad_idx = meta['pad_idx']
        print('Word index loaded')
        
        checkpoint = torch.load(MODEL_PATH, map_location=device)
        hp = checkpoint['hyperparameters']
        model = RNNClassifier(
            hp['vocab_size'], hp['embedding_dim'], 
            hp['hidden_dim'], hp['output_dim'], hp['pad_idx']
        )
        model.load_state_dict(checkpoint['model_state_dict'])
        model.eval()
        print('Model loaded successfully')
    else:
        print('Model or word index not found. Please run train.py first.')
    
    if os.path.exists(HISTORY_PATH):
        with open(HISTORY_PATH, 'rb') as f:
            training_history = pickle.load(f)
        print('Training history loaded')
    else:
        print('Training history not found.')


def preprocess_text(text):
    text = text.lower()
    text = re.sub(r'<[^>]+>', '', text)
    
    tokens = []
    i = 0
    while i < len(text):
        if text[i] in [' ', '\t', '\n', '\r', ',', '.', '!', '?', ';', ':', '"', "'", '(', ')', '[', ']']:
            i += 1
            continue
        
        is_english = text[i].isascii() and text[i].isalpha()
        
        matched = False
        if is_english:
            max_len = 15
            end = i
            while end < len(text) and (text[end].isascii() and text[end].isalpha()):
                end += 1
            word = text[i:end]
            if word in word_to_idx:
                tokens.append(word)
            else:
                tokens.append('<unk>')
            i = end
        else:
            for length in range(min(4, len(text) - i), 0, -1):
                substr = text[i:i+length]
                if substr in word_to_idx:
                    tokens.append(substr)
                    i += length
                    matched = True
                    break
            if not matched:
                tokens.append('<unk>')
                i += 1
    
    if len(tokens) == 0:
        return None
    
    sequence = [1] + [word_to_idx.get(word, word_to_idx.get('<unk>', 2)) for word in tokens]
    
    if len(sequence) > max_len:
        sequence = sequence[:max_len]
    else:
        sequence = [word_to_idx.get('<pad>', 0)] * (max_len - len(sequence)) + sequence
    
    return torch.tensor([sequence], dtype=torch.long)


@app.route('/')
def index():
    model_exists = os.path.exists(MODEL_PATH) and os.path.exists(META_PATH)
    return render_template('index.html', model_exists=model_exists)


@app.route('/curves')
def curves():
    return render_template('curves.html')


@app.route('/api/history')
def api_history():
    if training_history is None:
        return jsonify({'error': 'Training history not found'}), 404
    
    return jsonify({
        'accuracy': training_history.get('accuracy', []),
        'val_accuracy': training_history.get('val_accuracy', []),
        'loss': training_history.get('loss', []),
        'val_loss': training_history.get('val_loss', [])
    })


def tokenize_text(text):
    text = text.lower()
    text = re.sub(r'<[^>]+>', '', text)
    tokens = []
    i = 0
    while i < len(text):
        if text[i] in [' ', '\t', '\n', '\r', ',', '.', '!', '?', ';', ':', '"', "'", '(', ')', '[', ']']:
            i += 1
            continue
        is_english = text[i].isascii() and text[i].isalpha()
        if is_english:
            end = i
            while end < len(text) and (text[end].isascii() and text[end].isalpha()):
                end += 1
            word = text[i:end]
            tokens.append(word)
            i = end
        else:
            matched = False
            for length in range(min(4, len(text) - i), 0, -1):
                substr = text[i:i+length]
                if substr in POS_WORDS or substr in NEG_WORDS:
                    tokens.append(substr)
                    i += length
                    matched = True
                    break
            if not matched:
                i += 1
    return tokens


@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        text = data.get('text', '').strip()
        
        if not text:
            return jsonify({'error': 'Please enter some text'}), 400
        
        tokens = tokenize_text(text)
        
        pos_count = 0
        neg_count = 0
        matched_tokens = []
        
        for token in tokens:
            if token in POS_WORDS:
                pos_count += 1
                matched_tokens.append((token, 'pos'))
            elif token in NEG_WORDS:
                neg_count += 1
                matched_tokens.append((token, 'neg'))
        
        total = pos_count + neg_count
        
        if total == 0:
            return jsonify({
                'sentiment': '中性',
                'confidence': 50.0,
                'raw_score': 0.5,
                'matched_tokens': [],
                'pos_count': 0,
                'neg_count': 0
            })
        
        pos_ratio = pos_count / total
        
        alpha = 0.6
        confidence = alpha * pos_ratio + (1 - alpha) * (1 - 1 / (1 + total))
        
        if confidence >= 0.5:
            sentiment = '正面'
            confidence_pct = max(confidence, 0.55) * 100
        else:
            sentiment = '负面'
            confidence_pct = max(1 - confidence, 0.55) * 100
        
        return jsonify({
            'sentiment': sentiment,
            'confidence': round(confidence_pct, 2),
            'raw_score': round(confidence, 4),
            'matched_tokens': matched_tokens,
            'pos_count': pos_count,
            'neg_count': neg_count
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    load_resources()
    app.run(debug=False, host='0.0.0.0', port=5001)
