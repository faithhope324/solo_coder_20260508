from algorithms.smith_waterman import SmithWaterman

sw = SmithWaterman()
seq1 = 'AAAAATCGATCGATCGAAAAA'
seq2 = 'GGGGGTCGATCGATCGGGGGG'
print('序列1:', seq1, '(长度:', len(seq1), ')')
print('序列2:', seq2, '(长度:', len(seq2), ')')
result = sw.align(seq1, seq2)
print()
print('比对结果:')
print('  Seq1:', result['alignment1'], '(长度:', len(result['alignment1']), ')')
print('  Match:', result['matches'])
print('  Seq2:', result['alignment2'], '(长度:', len(result['alignment2']), ')')
print()
print('比对区域1:', result['aligned_regions1'])
print('比对区域2:', result['aligned_regions2'])
print()
print('说明: 灰色显示的是侧翼序列（未参与局部比对的区域）')
