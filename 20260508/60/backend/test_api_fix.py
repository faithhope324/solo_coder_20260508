import requests
import json

print("=== 测试双序列比对API (修复后) ===")
data = {
    'sequence1': '>seq1\nCCCCCAAATCGATCGTTTTT',
    'sequence2': '>seq2\nGGGGGAAATCGATCGAAAAA',
    'type': 'auto',
    'match_score': 2,
    'mismatch_score': -1,
    'gap_penalty': -2
}

response = requests.post('http://localhost:5000/api/pairwise-align', json=data)
print('状态码:', response.status_code)

if response.status_code == 200:
    result = response.json()
    print()
    print('输入序列1: CCCCCAAATCGATCGTTTTT')
    print('输入序列2: GGGGGAAATCGATCGAAAAA')
    print()
    print('输出序列1:', result['alignment1'])
    print('匹配线:    ', result['matches'])
    print('输出序列2:', result['alignment2'])
    print()
    print('比对区域1:', result.get('aligned_regions1'))
    print('比对区域2:', result.get('aligned_regions2'))
    print()
    print('完整性检查:')
    seq1_clean = result['alignment1'].replace('-', '')
    seq2_clean = result['alignment2'].replace('-', '')
    print('  序列1一致:', seq1_clean == 'CCCCCAAATCGATCGTTTTT')
    print('  序列2一致:', seq2_clean == 'GGGGGAAATCGATCGAAAAA')
    print()
    print('得分:', result['score'])
    print('相似度:', result['identity'], '%')
else:
    print('错误:', response.json())
