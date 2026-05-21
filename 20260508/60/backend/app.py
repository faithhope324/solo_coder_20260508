import json
import numpy as np
from flask import Flask, request, Response
from flask_cors import CORS
from algorithms.smith_waterman import SmithWaterman
from algorithms.msa import MultipleSequenceAlignment
from utils.fasta_parser import parse_fasta, validate_sequence, detect_sequence_type


class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)


def json_response(data, status=200):
    return Response(
        json.dumps(data, cls=NumpyEncoder),
        status=status,
        mimetype='application/json'
    )


app = Flask(__name__)
CORS(app)


@app.route('/api/pairwise-align', methods=['POST'])
def pairwise_align():
    try:
        data = request.get_json()

        seq1_input = data.get('sequence1', '').strip()
        seq2_input = data.get('sequence2', '').strip()
        seq_type = data.get('type', 'auto')

        if not seq1_input or not seq2_input:
            return json_response({'error': 'Both sequences are required'}, 400)

        seq1_data = parse_fasta(seq1_input)
        seq2_data = parse_fasta(seq2_input)

        seq1 = seq1_data[0]['sequence'] if seq1_data else seq1_input.replace('>', '').split('\n', 1)[-1].replace('\n', '')
        seq2 = seq2_data[0]['sequence'] if seq2_data else seq2_input.replace('>', '').split('\n', 1)[-1].replace('\n', '')

        seq1 = seq1.upper().replace(' ', '')
        seq2 = seq2.upper().replace(' ', '')

        if seq_type == 'auto':
            seq_type = detect_sequence_type(seq1 + seq2)

        valid1, msg1 = validate_sequence(seq1, seq_type)
        valid2, msg2 = validate_sequence(seq2, seq_type)

        if not valid1:
            return json_response({'error': f'Sequence 1: {msg1}'}, 400)
        if not valid2:
            return json_response({'error': f'Sequence 2: {msg2}'}, 400)

        match_score = data.get('match_score', 2)
        mismatch_score = data.get('mismatch_score', -1)
        gap_penalty = data.get('gap_penalty', -2)

        sw = SmithWaterman(match_score, mismatch_score, gap_penalty)
        result = sw.align(seq1, seq2)

        result['type'] = seq_type
        result['seq1_id'] = seq1_data[0]['id'] if seq1_data else 'Sequence 1'
        result['seq2_id'] = seq2_data[0]['id'] if seq2_data else 'Sequence 2'
        result['seq1_original'] = seq1
        result['seq2_original'] = seq2

        return json_response(result)

    except Exception as e:
        return json_response({'error': str(e)}), 500


@app.route('/api/multiple-align', methods=['POST'])
def multiple_align():
    try:
        data = request.get_json()

        sequences_input = data.get('sequences', [])
        seq_type = data.get('type', 'auto')

        if len(sequences_input) < 2:
            return json_response({'error': 'At least 2 sequences are required'}, 400)
        if len(sequences_input) > 5:
            return json_response({'error': 'Maximum 5 sequences supported'}, 400)

        parsed_sequences = []
        seq_ids = []

        for i, seq_input in enumerate(sequences_input):
            seq_data = parse_fasta(seq_input.strip())
            if seq_data:
                parsed_sequences.append(seq_data[0]['sequence'].upper().replace(' ', ''))
                seq_ids.append(seq_data[0]['id'])
            else:
                seq = seq_input.strip().replace('>', '').split('\n', 1)[-1].replace('\n', '').upper().replace(' ', '')
                parsed_sequences.append(seq)
                seq_ids.append(f'Sequence {i + 1}')

        if seq_type == 'auto':
            combined = ''.join(parsed_sequences)
            seq_type = detect_sequence_type(combined)

        for i, seq in enumerate(parsed_sequences):
            valid, msg = validate_sequence(seq, seq_type)
            if not valid:
                return json_response({'error': f'Sequence {i + 1}: {msg}'}, 400)

        match_score = data.get('match_score', 2)
        mismatch_score = data.get('mismatch_score', -1)
        gap_penalty = data.get('gap_penalty', -2)

        msa = MultipleSequenceAlignment(match_score, mismatch_score, gap_penalty)
        result = msa.align(parsed_sequences)

        if 'error' in result:
            return json_response(result), 400

        result['type'] = seq_type
        result['sequence_ids'] = seq_ids
        result['original_sequences'] = parsed_sequences

        return json_response(result)

    except Exception as e:
        return json_response({'error': str(e)}), 500


@app.route('/api/validate-sequence', methods=['POST'])
def validate_seq():
    try:
        data = request.get_json()
        seq = data.get('sequence', '').upper().replace(' ', '')
        seq_type = data.get('type', 'auto')

        if seq_type == 'auto':
            seq_type = detect_sequence_type(seq)

        valid, message = validate_sequence(seq, seq_type)

        return json_response({
            'valid': valid,
            'message': message,
            'type': seq_type,
            'length': len(seq)
        })

    except Exception as e:
        return json_response({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health():
    return json_response({'status': 'ok'})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
