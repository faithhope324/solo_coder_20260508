import sys
sys.path.insert(0, '.')

from algorithms.smith_waterman import SmithWaterman
from algorithms.msa import MultipleSequenceAlignment
from utils.fasta_parser import parse_fasta, validate_sequence, detect_sequence_type

print("=" * 50)
print("测试 Smith-Waterman 算法")
print("=" * 50)

sw = SmithWaterman(match_score=2, mismatch_score=-1, gap_penalty=-2)

seq1 = "ATCGATCGATCGATCG"
seq2 = "ATCGATCGAGCTAGCT"

result = sw.align(seq1, seq2)
print(f"序列1: {seq1}")
print(f"序列2: {seq2}")
print(f"得分: {result['score']}")
print(f"相似度: {result['identity']}%")
print(f"比对结果:")
print(f"  {result['alignment1']}")
print(f"  {result['matches']}")
print(f"  {result['alignment2']}")
print()

print("=" * 50)
print("测试多序列比对")
print("=" * 50)

msa = MultipleSequenceAlignment(match_score=2, mismatch_score=-1, gap_penalty=-2)

sequences = [
    "ATCGATCGATCGATCG",
    "ATCGATCGAGCTAGCT",
    "ATCGAGCTAGCTAGCT"
]

result = msa.align(sequences)
print(f"序列数量: {len(sequences)}")
print(f"比对长度: {result['alignment_length']}")
print(f"比对结果:")
for i, aln in enumerate(result['alignments']):
    print(f"  Seq{i+1}: {aln}")
print(f"  Cons:  {result['consensus']}")
print()
print("相似度矩阵:")
for row in result['similarity_matrix']:
    print(f"  {row}")
print()

print("=" * 50)
print("测试 FASTA 解析")
print("=" * 50)

fasta_content = """>seq1
ATCGATCGATCGATCG
>seq2
ATCGATCGAGCTAGCT"""

parsed = parse_fasta(fasta_content)
for item in parsed:
    print(f"ID: {item['id']}")
    print(f"序列: {item['sequence']}")
print()

print("=" * 50)
print("测试序列验证和类型检测")
print("=" * 50)

dna_seq = "ATCGATCG"
protein_seq = "MKVLWAALLVTFLAGCQAKVE"

print(f"DNA序列类型检测: {detect_sequence_type(dna_seq)}")
print(f"蛋白质序列类型检测: {detect_sequence_type(protein_seq)}")

valid, msg = validate_sequence(dna_seq, 'dna')
print(f"DNA序列验证: {'通过' if valid else '失败'} - {msg}")

valid, msg = validate_sequence(protein_seq, 'protein')
print(f"蛋白质序列验证: {'通过' if valid else '失败'} - {msg}")

print()
print("✅ 所有测试通过!")
