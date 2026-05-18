import requests

test_cases = [
    ('好棒！', '正面'),
    ('太烂了', '负面'),
    ('喜欢', '正面'),
    ('讨厌', '负面'),
    ('精彩', '正面'),
    ('无聊', '负面'),
    ('感动', '正面'),
    ('垃圾', '负面'),
    ('推荐', '正面'),
    ('浪费时间', '负面'),
    ('优秀', '正面'),
    ('糟糕', '负面'),
    ('这部电影真的很棒，演技出色，剧情精彩！', '正面'),
    ('这个片子太垃圾了，浪费钱又浪费时间！', '负面'),
    ('This movie is amazing and fantastic!', '正面'),
    ('This film is terrible and boring!', '负面'),
    ('I love this great wonderful excellent movie!', '正面'),
    ('I hate this bad terrible awful horrible film!', '负面'),
]

print('=== 中英文情感分析测试 ===\n')
passed = 0
for text, expected in test_cases:
    try:
        resp = requests.post('http://127.0.0.1:5001/api/predict', 
                           json={'text': text}, timeout=10)
        result = resp.json()
        sentiment = result.get('sentiment', '未知')
        conf = result.get('confidence', 0)
        matched = result.get('matched_tokens', [])
        status = '✓' if sentiment == expected else '✗'
        if sentiment == expected:
            passed += 1
        print(f'{status} "{text}"')
        print(f'   -> {sentiment} ({conf}%)  [期望: {expected}]')
        if matched:
            print(f'   匹配词: {matched}')
        print()
    except Exception as e:
        print(f'✗ "{text}"')
        print(f'   -> 错误: {e}\n')

print(f'总计: {passed}/{len(test_cases)} 测试通过')
