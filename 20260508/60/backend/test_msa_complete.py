# -*- coding: utf-8 -*-
from algorithms.msa import MultipleSequenceAlignment
import sys
sys.stdout.reconfigure(encoding='utf-8')

msa = MultipleSequenceAlignment()

seqs = [
    'XXXXXATCGATCGYYYYY',
    'ZZZZZATCGATCGWWWWW',
    'AAAAATCGATCGBBBBB'
]

print('=== 输入序列 ===')
for i, s in enumerate(seqs):
    print('序列%d: %s (长度: %d)' % (i+1, s, len(s)))
print()

result = msa.align(seqs)

print('=== 比对输出 ===')
for i, aln in enumerate(result['alignments']):
    print('序列%d: %s' % (i+1, aln))
print('Cons:  %s' % result['consensus'])
print()

print('=== 完整性检查 ===')
all_match = True
for i, (orig, aln) in enumerate(zip(seqs, result['alignments'])):
    aln_clean = aln.replace('-', '')
    match = orig == aln_clean
    if not match:
        all_match = False
    status = 'OK' if match else 'FAIL'
    print('序列%d: 输入=%s vs 输出=%s -> %s' % (i+1, orig, aln_clean, status))

print()
if all_match:
    print('所有序列输出完整!')
else:
    print('存在序列不完整!')
