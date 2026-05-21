import numpy as np
from typing import Tuple, List, Dict


class SmithWaterman:
    def __init__(self, match_score: int = 2, mismatch_score: int = -1, gap_penalty: int = -2):
        self.match_score = match_score
        self.mismatch_score = mismatch_score
        self.gap_penalty = gap_penalty

    def _score(self, a: str, b: str) -> int:
        if a == b:
            return self.match_score
        return self.mismatch_score

    def align(self, seq1: str, seq2: str) -> Dict:
        n, m = len(seq1), len(seq2)
        H = np.zeros((n + 1, m + 1), dtype=int)
        traceback = np.zeros((n + 1, m + 1), dtype=int)

        max_score = 0
        max_pos = (0, 0)

        for i in range(1, n + 1):
            for j in range(1, m + 1):
                diag = H[i - 1][j - 1] + self._score(seq1[i - 1], seq2[j - 1])
                up = H[i - 1][j] + self.gap_penalty
                left = H[i][j - 1] + self.gap_penalty

                H[i][j] = max(0, diag, up, left)

                if H[i][j] == diag:
                    traceback[i][j] = 1
                elif H[i][j] == up:
                    traceback[i][j] = 2
                elif H[i][j] == left:
                    traceback[i][j] = 3

                if H[i][j] > max_score:
                    max_score = H[i][j]
                    max_pos = (i, j)

        align1, align2, matches, align_start1, align_start2 = self._traceback(seq1, seq2, traceback, max_pos)

        full_align1, full_align2, full_matches, aligned_regions1, aligned_regions2 = self._build_full_alignment(
            seq1, seq2, align1, align2, matches, align_start1, align_start2
        )

        identity = sum(1 for a, b in zip(full_align1, full_align2) if a == b and a != '-') / max(len(full_align1), len(full_align2)) * 100

        return {
            'alignment1': full_align1,
            'alignment2': full_align2,
            'matches': full_matches,
            'score': max_score,
            'identity': round(identity, 2),
            'gap_count1': full_align1.count('-'),
            'gap_count2': full_align2.count('-'),
            'aligned_regions1': aligned_regions1,
            'aligned_regions2': aligned_regions2,
            'matrix': H.tolist()
        }

    def _traceback(self, seq1: str, seq2: str, traceback: np.ndarray, start_pos: Tuple[int, int]) -> Tuple[str, str, str, int, int]:
        i, j = start_pos
        end_i, end_j = i, j
        align1, align2, matches = [], [], []

        while i > 0 and j > 0 and traceback[i][j] != 0:
            if traceback[i][j] == 1:
                align1.append(seq1[i - 1])
                align2.append(seq2[j - 1])
                matches.append('|' if seq1[i - 1] == seq2[j - 1] else ' ')
                i -= 1
                j -= 1
            elif traceback[i][j] == 2:
                align1.append(seq1[i - 1])
                align2.append('-')
                matches.append(' ')
                i -= 1
            elif traceback[i][j] == 3:
                align1.append('-')
                align2.append(seq2[j - 1])
                matches.append(' ')
                j -= 1

        start_i, start_j = i, j
        return (''.join(reversed(align1)), ''.join(reversed(align2)), ''.join(reversed(matches)), start_i, start_j)

    def _build_full_alignment(self, seq1: str, seq2: str, align1: str, align2: str, matches: str, start1: int, start2: int) -> Tuple[str, str, str, List[Tuple[int, int]], List[Tuple[int, int]]]:
        prefix1 = seq1[:start1]
        suffix1 = seq1[start1 + len(align1.replace('-', '')):]

        prefix2 = seq2[:start2]
        suffix2 = seq2[start2 + len(align2.replace('-', '')):]

        max_prefix = max(len(prefix1), len(prefix2))
        max_suffix = max(len(suffix1), len(suffix2))

        padded_prefix1 = '-' * (max_prefix - len(prefix1)) + prefix1
        padded_prefix2 = '-' * (max_prefix - len(prefix2)) + prefix2

        padded_suffix1 = suffix1 + '-' * (max_suffix - len(suffix1))
        padded_suffix2 = suffix2 + '-' * (max_suffix - len(suffix2))

        prefix_matches = ' ' * max_prefix
        suffix_matches = ' ' * max_suffix

        full_align1 = padded_prefix1 + align1 + padded_suffix1
        full_align2 = padded_prefix2 + align2 + padded_suffix2
        full_matches = prefix_matches + matches + suffix_matches

        aligned_regions1 = [(max_prefix, max_prefix + len(align1) - 1)]
        aligned_regions2 = [(max_prefix, max_prefix + len(align2) - 1)]

        return full_align1, full_align2, full_matches, aligned_regions1, aligned_regions2
