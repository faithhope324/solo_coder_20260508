import pickle

with open('models/word_index.pkl', 'rb') as f:
    meta = pickle.load(f)

word_to_idx = meta['word_to_idx']

test_words = ['好棒', '喜欢', '精彩', '感动', '推荐', '优秀', 'amazing', 'fantastic', 'good', 'great']
print('词汇表检查:')
for w in test_words:
    idx = word_to_idx.get(w, 'NOT FOUND')
    print(f'  "{w}": {idx}')

print('\n正面词前10个:', list(word_to_idx.keys())[3:13])
print('负面词前10个:', list(word_to_idx.keys())[74:84])
