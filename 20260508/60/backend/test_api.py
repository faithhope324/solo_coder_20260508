import requests
import json

print("测试多序列比对API...")
data = {
    'sequences': [
        '>seq1\nATCGATCGATCGATCG',
        '>seq2\nATCGATCGAGCTAGCT',
        '>seq3\nATCGAGCTAGCTAGCT'
    ],
    'type': 'auto',
    'match_score': 2,
    'mismatch_score': -1,
    'gap_penalty': -2
}

response = requests.post('http://localhost:5000/api/multiple-align', json=data)
print('状态码:', response.status_code)
result = response.json()
if response.status_code == 200:
    print('序列数量:', len(result.get('sequence_ids', [])))
    print('比对长度:', result.get('alignment_length'))
    print('比对结果:')
    for i, aln in enumerate(result.get('alignments', [])):
        print(f'  Seq{i+1}: {aln}')
    print(f'  Cons:  {result.get("consensus")}')
    print('相似度矩阵:')
    for row in result.get('similarity_matrix', []):
        print(f'  {row}')
else:
    print('错误:', result)
