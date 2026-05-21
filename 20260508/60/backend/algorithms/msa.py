import numpy as np
from typing import List, Dict, Tuple
from .smith_waterman import SmithWaterman


class MultipleSequenceAlignment:
    def __init__(self, match_score: int = 2, mismatch_score: int = -1, gap_penalty: int = -2):
        self.sw = SmithWaterman(match_score, mismatch_score, gap_penalty)
        self.match_score = match_score
        self.mismatch_score = mismatch_score
        self.gap_penalty = gap_penalty

    def _pairwise_distance(self, seq1: str, seq2: str) -> float:
        result = self.sw.align(seq1, seq2)
        max_len = max(len(seq1), len(seq2))
        matches = sum(1 for a, b in zip(result['alignment1'], result['alignment2']) if a == b and a != '-')
        return 1 - (matches / max_len) if max_len > 0 else 0

    def _build_distance_matrix(self, sequences: List[str]) -> np.ndarray:
        n = len(sequences)
        dist = np.zeros((n, n))
        for i in range(n):
            for j in range(i + 1, n):
                d = self._pairwise_distance(sequences[i], sequences[j])
                dist[i][j] = d
                dist[j][i] = d
        return dist

    def _guide_tree(self, dist: np.ndarray) -> List[int]:
        n = len(dist)
        clusters = [[i] for i in range(n)]
        order = []

        while len(clusters) > 1:
            min_dist = float('inf')
            merge_i, merge_j = 0, 0

            for i in range(len(clusters)):
                for j in range(i + 1, len(clusters)):
                    avg_dist = np.mean([dist[x][y] for x in clusters[i] for y in clusters[j]])
                    if avg_dist < min_dist:
                        min_dist = avg_dist
                        merge_i, merge_j = i, j

            order.append((clusters[merge_i][0], clusters[merge_j][0]))
            clusters[merge_i] = clusters[merge_i] + clusters[merge_j]
            del clusters[merge_j]

        return [item for pair in order for item in pair]

    def align(self, sequences: List[str]) -> Dict:
        n = len(sequences)
        if n < 2:
            return {'error': 'Need at least 2 sequences'}
        if n > 5:
            return {'error': 'Maximum 5 sequences supported'}

        dist_matrix = self._build_distance_matrix(sequences)

        alignments = [list(seq) for seq in sequences]
        aligned_indices = set()

        result = self.sw.align(sequences[0], sequences[1])
        alignments[0] = list(result['alignment1'])
        alignments[1] = list(result['alignment2'])
        aligned_indices.add(0)
        aligned_indices.add(1)

        for idx in range(2, n):
            best_align_idx = -1
            best_result = None
            best_score = -float('inf')

            for aligned_idx in aligned_indices:
                aligned_seq = ''.join([c for c in alignments[aligned_idx] if c != '-'])
                current_result = self.sw.align(aligned_seq, sequences[idx])
                if current_result['score'] > best_score:
                    best_score = current_result['score']
                    best_align_idx = aligned_idx
                    best_result = current_result

            ref_aligned = alignments[best_align_idx]
            new_aligned = list(best_result['alignment2'])
            ref_parts = list(best_result['alignment1'])

            pos_map = {}
            ref_pos = 0
            for i, c in enumerate(ref_aligned):
                if c != '-':
                    pos_map[ref_pos] = i
                    ref_pos += 1

            final_new = ['-'] * len(ref_aligned)
            new_pos = 0
            for i, c in enumerate(ref_parts):
                if c != '-':
                    if new_pos < len(new_aligned) and new_aligned[new_pos] == best_result['alignment2'][i]:
                        orig_pos = pos_map.get(new_pos)
                        if orig_pos is not None and orig_pos < len(final_new):
                            final_new[orig_pos] = best_result['alignment2'][i]
                    new_pos += 1

            for i, c in enumerate(best_result['alignment2']):
                if i < len(ref_parts) and ref_parts[i] == '-' and c != '-':
                    insert_pos = 0
                    count = 0
                    for j in range(i):
                        if ref_parts[j] != '-':
                            count += 1
                    for k in range(len(ref_aligned)):
                        if ref_aligned[k] != '-':
                            if count == 0:
                                insert_pos = k
                                break
                            count -= 1
                        if k == len(ref_aligned) - 1:
                            insert_pos = k + 1

                    for j in range(len(alignments)):
                        if j in aligned_indices:
                            if insert_pos < len(alignments[j]):
                                alignments[j].insert(insert_pos, '-')
                            else:
                                alignments[j].append('-')
                    final_new.insert(insert_pos, c)

            while len(final_new) < max(len(a) for a in alignments):
                final_new.append('-')

            alignments[idx] = final_new
            aligned_indices.add(idx)

        max_len = max(len(a) for a in alignments)
        for i in range(n):
            while len(alignments[i]) < max_len:
                alignments[i].append('-')

        aligned_strings = [''.join(aln) for aln in alignments]

        similarity_matrix = np.zeros((n, n))
        for i in range(n):
            for j in range(n):
                if i == j:
                    similarity_matrix[i][j] = 100.0
                else:
                    matches = sum(1 for a, b in zip(aligned_strings[i], aligned_strings[j])
                                  if a == b and a != '-')
                    total = sum(1 for a, b in zip(aligned_strings[i], aligned_strings[j])
                                if a != '-' or b != '-')
                    similarity_matrix[i][j] = round((matches / total * 100) if total > 0 else 0, 2)

        consensus = []
        for i in range(max_len):
            counts = {}
            for j in range(n):
                c = aligned_strings[j][i]
                if c != '-':
                    counts[c] = counts.get(c, 0) + 1
            if counts:
                consensus.append(max(counts, key=counts.get))
            else:
                consensus.append('-')

        return {
            'alignments': aligned_strings,
            'consensus': ''.join(consensus),
            'similarity_matrix': similarity_matrix.tolist(),
            'distance_matrix': dist_matrix.tolist(),
            'alignment_length': max_len
        }
