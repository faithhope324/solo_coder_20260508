import os
import pickle
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from torch.utils.data import Dataset, DataLoader
import torch
import torch.nn as nn
import torch.optim as optim

os.makedirs('models', exist_ok=True)
os.makedirs('static', exist_ok=True)

POS_WORDS = [
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
    '超好', '很棒', '太赞', '真赞', '极好', '绝佳',
    '赞爆', '爱了', '喜欢了', '太好看', '超好看', '超棒'
]

NEG_WORDS = [
    'bad', 'terrible', 'awful', 'horrible', 'worst', 'poor',
    'hate', 'dislike', 'boring', 'dull', 'disappointing', 'waste',
    'sad', 'angry', 'annoying', 'frustrating', 'mediocre', 'lame',
    'stupid', 'dumb', 'ridiculous', 'pathetic', 'useless', 'failed',
    'uninteresting', 'predictable', 'slow', 'tedious',
    '烂', '差', '糟', '垃圾', '恶心', '垃圾片',
    '讨厌', '恨', '不喜欢', '失望', '绝望', '难过',
    '伤心', '生气', '愤怒', '无聊', '乏味', '枯燥',
    '难看', '糟糕', '恐怖', '最差', '浪费', '坑爹',
    '骗钱', '圈钱', '抄袭', '山寨', '尴尬', '狗血',
    '雷人', '脑残', '智障', '愚蠢', '扯淡', '毁三观',
    '看不下去', '睡着了', '中途离场', '后悔', '不值'
]

NEUTRAL_WORDS = [
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to',
    'for', 'of', 'with', 'by', 'from', 'is', 'was', 'are', 'were',
    'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'will', 'would', 'could', 'should', 'this', 'that', 'these', 'those',
    'it', 'its', 'they', 'them', 'he', 'she', 'we', 'us', 'i', 'you',
    'me', 'my', 'your', 'his', 'her', 'their', 'our', 'not', 'no',
    'so', 'very', 'too', 'just', 'also', 'now', 'movie', 'film',
    'watch', 'seen', 'see', 'really', 'think', 'story', 'character',
    'plot', 'acting', 'director', 'scene', 'time', 'people', 'way',
    'well', 'much', 'more', 'most', 'even', 'can', 'make', 'made',
    'get', 'got', 'take', 'about', 'into', 'than', 'then', 'because',
    'while', 'though', 'before', 'after', 'again', 'still', 'same',
    'each', 'every', 'all', 'both', 'few', 'other', 'some', 'such',
    '一般', '还行', '普通', '平淡', '平庸', '中规中矩',
    '电影', '影片', '片子', '看', '看过', '觉得', '故事', '情节',
    '剧情', '演员', '演技', '导演', '画面', '特效', '音乐', '配乐',
    '节奏', '氛围', '很', '非常', '特别', '真的', '太', '超',
    '最', '更', '都', '也', '还', '就', '是', '的', '了', '在',
    '有', '和', '与', '及', '等', '中', '上', '下', '不', '没',
    '没有', '不是', '不要', '不能', '我', '你', '他', '她', '它',
    '我们', '你们', '他们', '她们', '它们', '这', '那', '个', '部',
    '集', '季', '年', '月', '日', '一', '二', '三', '四', '五', '六',
    '七', '八', '九', '十', '两', '多', '少', '大', '小', '高', '低',
    '快', '慢', '新', '旧', '老', '强', '弱'
]

ALL_WORDS = ['<pad>', '<start>', '<unk>'] + POS_WORDS + NEG_WORDS + NEUTRAL_WORDS
VOCAB = {w: i for i, w in enumerate(ALL_WORDS)}
VOCAB_SIZE = len(VOCAB)

POS_IDX = set(range(3, 3 + len(POS_WORDS)))
NEG_IDX = set(range(3 + len(POS_WORDS), 3 + len(POS_WORDS) + len(NEG_WORDS)))
NEUTRAL_IDX = set(range(3 + len(POS_WORDS) + len(NEG_WORDS), len(ALL_WORDS)))

class IMDBDataset(Dataset):
    def __init__(self, x, y):
        self.x = x
        self.y = y
    def __len__(self):
        return len(self.x)
    def __getitem__(self, idx):
        return torch.tensor(self.x[idx], dtype=torch.long), torch.tensor(self.y[idx], dtype=torch.float32)

class RNNClassifier(nn.Module):
    def __init__(self, vocab_size, embedding_dim, hidden_dim, output_dim, pad_idx):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embedding_dim, padding_idx=pad_idx)
        self.lstm = nn.LSTM(embedding_dim, hidden_dim, batch_first=True, bidirectional=True, num_layers=2, dropout=0.3)
        self.fc1 = nn.Linear(hidden_dim * 2, 64)
        self.dropout = nn.Dropout(0.5)
        self.fc2 = nn.Linear(64, output_dim)
    def forward(self, x):
        x = self.embedding(x)
        output, (hidden, cell) = self.lstm(x)
        hidden = torch.cat([hidden[-2,:,:], hidden[-1,:,:]], dim=1)
        x = self.dropout(hidden)
        x = torch.relu(self.fc1(x))
        x = self.dropout(x)
        return torch.sigmoid(self.fc2(x))

def generate_data(num_samples, max_len=200):
    x, y = [], []
    pos_list = list(POS_IDX)
    neg_list = list(NEG_IDX)
    neu_list = list(NEUTRAL_IDX)
    
    for i in range(num_samples):
        is_pos = i % 2 == 0
        length = np.random.randint(15, 60)
        sent_list = pos_list if is_pos else neg_list
        num_sent = max(3, length // 3)
        words = list(np.random.choice(sent_list, num_sent))
        words += list(np.random.choice(neu_list, length - num_sent))
        np.random.shuffle(words)
        seq = [1] + list(words)
        if len(seq) > max_len:
            seq = seq[:max_len]
        else:
            seq = [0] * (max_len - len(seq)) + seq
        x.append(seq)
        y.append(1 if is_pos else 0)
    return np.array(x, dtype=np.int64), np.array(y, dtype=np.float32)

def main():
    max_len = 200
    vocab_size = VOCAB_SIZE + 10
    embedding_dim = 64
    hidden_dim = 64
    epochs = 15
    batch_size = 32
    lr = 0.001

    print('='*60)
    print('RNN Sentiment Analysis Training (中文/English)')
    print('='*60)
    print(f'\nTotal vocab: {VOCAB_SIZE}, Max len: {max_len}')
    print(f'Positive: {len(POS_WORDS)}, Negative: {len(NEG_WORDS)}, Neutral: {len(NEUTRAL_WORDS)}')
    
    print('\n[1/4] Generating training data...')
    x_train, y_train = generate_data(3000, max_len)
    x_test, y_test = generate_data(1000, max_len)
    print(f'  Train: {len(x_train)}, Test: {len(x_test)}')
    
    idx_to_word = {v: k for k, v in VOCAB.items()}
    with open('models/word_index.pkl', 'wb') as f:
        pickle.dump({
            'word_to_idx': VOCAB, 'idx_to_word': idx_to_word,
            'max_len': max_len, 'vocab_size': vocab_size, 'pad_idx': 0
        }, f)
    print('  Word index saved.')
    
    print('\n[2/4] Creating model and data loaders...')
    train_ds = IMDBDataset(x_train, y_train)
    test_ds = IMDBDataset(x_test, y_test)
    train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    test_loader = DataLoader(test_ds, batch_size=batch_size, shuffle=False)
    
    device = torch.device('cpu')
    model = RNNClassifier(vocab_size, embedding_dim, hidden_dim, 1, 0).to(device)
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    print(f'Model params: {sum(p.numel() for p in model.parameters()):,}')
    
    print(f'\n[3/4] Training {epochs} epochs...')
    train_losses, train_accs, val_losses, val_accs = [], [], [], []
    
    for epoch in range(epochs):
        model.train()
        tl, ta, n_batches = 0.0, 0.0, 0
        for texts, labels in train_loader:
            texts, labels = texts.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(texts).squeeze()
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            tl += loss.item()
            preds = (outputs > 0.5).float()
            ta += (preds == labels).sum().item() / len(labels)
            n_batches += 1
        
        train_losses.append(tl / n_batches)
        train_accs.append(ta / n_batches)
        
        model.eval()
        vl, va, n_batches = 0.0, 0.0, 0
        with torch.no_grad():
            for texts, labels in test_loader:
                texts, labels = texts.to(device), labels.to(device)
                outputs = model(texts).squeeze()
                vl += criterion(outputs, labels).item()
                preds = (outputs > 0.5).float()
                va += (preds == labels).sum().item() / len(labels)
                n_batches += 1
        
        val_losses.append(vl / n_batches)
        val_accs.append(va / n_batches)
        
        print(f'  Epoch {epoch+1}: '
              f'Train Loss={train_losses[-1]:.4f} Acc={train_accs[-1]:.4f} | '
              f'Val Loss={val_losses[-1]:.4f} Acc={val_accs[-1]:.4f}')
    
    print('\n[4/4] Saving model and training curves...')
    history = {
        'accuracy': train_accs, 'val_accuracy': val_accs,
        'loss': train_losses, 'val_loss': val_losses
    }
    with open('models/training_history.pkl', 'wb') as f:
        pickle.dump(history, f)
    
    torch.save({
        'model_state_dict': model.state_dict(),
        'hyperparameters': {
            'vocab_size': vocab_size, 'embedding_dim': embedding_dim,
            'hidden_dim': hidden_dim, 'output_dim': 1, 'pad_idx': 0
        }
    }, 'models/sentiment_rnn.pth')
    
    plt.style.use('seaborn-v0_8-darkgrid')
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    
    ax1.plot(train_accs, label='Train', linewidth=2, marker='o')
    ax1.plot(val_accs, label='Validation', linewidth=2, marker='s')
    ax1.set_title('Model Accuracy', fontsize=14, fontweight='bold')
    ax1.set_xlabel('Epoch'), ax1.set_ylabel('Accuracy')
    ax1.legend(), ax1.grid(True, alpha=0.3)
    ax1.set_xticks(range(epochs)), ax1.set_xticklabels([str(i+1) for i in range(epochs)])
    
    ax2.plot(train_losses, label='Train', linewidth=2, marker='o')
    ax2.plot(val_losses, label='Validation', linewidth=2, marker='s')
    ax2.set_title('Model Loss', fontsize=14, fontweight='bold')
    ax2.set_xlabel('Epoch'), ax2.set_ylabel('Loss')
    ax2.legend(), ax2.grid(True, alpha=0.3)
    ax2.set_xticks(range(epochs)), ax2.set_xticklabels([str(i+1) for i in range(epochs)])
    
    plt.tight_layout()
    plt.savefig('static/training_curves.png', dpi=150, bbox_inches='tight')
    
    print('\n' + '='*60)
    print('Training complete! Run: python app.py')
    print('='*60)

if __name__ == '__main__':
    main()
