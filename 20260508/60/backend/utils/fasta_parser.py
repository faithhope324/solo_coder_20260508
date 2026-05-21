import re
from typing import List, Dict, Tuple


def parse_fasta(content: str) -> List[Dict[str, str]]:
    sequences = []
    current_id = None
    current_seq = []

    lines = content.strip().split('\n')
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith('>'):
            if current_id is not None:
                sequences.append({
                    'id': current_id,
                    'sequence': ''.join(current_seq)
                })
            current_id = line[1:].strip()
            current_seq = []
        else:
            current_seq.append(re.sub(r'\s+', '', line.upper()))

    if current_id is not None:
        sequences.append({
            'id': current_id,
            'sequence': ''.join(current_seq)
        })

    return sequences


def validate_sequence(seq: str, seq_type: str = 'dna') -> Tuple[bool, str]:
    if not seq:
        return False, 'Sequence is empty'

    if seq_type == 'dna':
        valid_chars = set('ATCGN')
        seq_upper = seq.upper()
        invalid = [c for c in seq_upper if c not in valid_chars]
        if invalid:
            return False, f'Invalid DNA characters: {", ".join(set(invalid))}'
    elif seq_type == 'protein':
        valid_chars = set('ACDEFGHIKLMNPQRSTVWY*')
        seq_upper = seq.upper()
        invalid = [c for c in seq_upper if c not in valid_chars]
        if invalid:
            return False, f'Invalid protein characters: {", ".join(set(invalid))}'

    return True, ''


def detect_sequence_type(seq: str) -> str:
    seq_upper = seq.upper()
    dna_chars = set('ATCG')
    protein_specific = set('EFHIKLMNPQRSTVWY')

    seq_chars = set(seq_upper)
    if seq_chars & protein_specific:
        return 'protein'
    return 'dna'
