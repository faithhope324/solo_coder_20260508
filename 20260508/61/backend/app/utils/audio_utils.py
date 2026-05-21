import os
import base64
import struct
import wave
import subprocess
from typing import List, Dict, Any, Tuple

import numpy as np
from scipy.io import wavfile

SAMPLE_RATE = 44100


def midi_pitch_to_freq(pitch: int) -> float:
    return 440.0 * (2.0 ** ((pitch - 69) / 12.0))


def generate_sine_wave(freq: float, duration: float, sample_rate: int = SAMPLE_RATE) -> np.ndarray:
    t = np.linspace(0, duration, int(sample_rate * duration), endpoint=False)
    return np.sin(2 * np.pi * freq * t)


def generate_envelope(duration: float, sample_rate: int = SAMPLE_RATE,
                      attack: float = 0.01, decay: float = 0.1,
                      sustain: float = 0.7, release: float = 0.1) -> np.ndarray:
    total_samples = int(sample_rate * duration)
    envelope = np.ones(total_samples)

    attack_samples = int(attack * sample_rate)
    decay_samples = int(decay * sample_rate)
    release_samples = int(release * sample_rate)

    if attack_samples > 0:
        envelope[:attack_samples] = np.linspace(0, 1, attack_samples)

    if decay_samples > 0 and attack_samples + decay_samples < total_samples:
        envelope[attack_samples:attack_samples + decay_samples] = np.linspace(1, sustain, decay_samples)

    if release_samples > 0 and release_samples < total_samples:
        envelope[-release_samples:] = np.linspace(sustain, 0, release_samples)

    return envelope


def synthesize_note(freq: float, duration: float, velocity: int,
                    sample_rate: int = SAMPLE_RATE) -> np.ndarray:
    amplitude = velocity / 127.0 * 0.3
    wave = generate_sine_wave(freq, duration, sample_rate)
    envelope = generate_envelope(duration, sample_rate)

    overtone1 = generate_sine_wave(freq * 2, duration, sample_rate) * 0.3
    overtone2 = generate_sine_wave(freq * 3, duration, sample_rate) * 0.1

    combined = (wave + overtone1 + overtone2) * envelope * amplitude
    return combined


def midi_to_wav(notes: List[Dict[str, Any]], output_path: str,
                sample_rate: int = SAMPLE_RATE, total_duration: float = 30.0) -> None:
    total_samples = int(sample_rate * total_duration)
    audio = np.zeros(total_samples, dtype=np.float64)

    for note in notes:
        pitch = note['pitch']
        start_time = note['start_time']
        duration = note['duration']
        velocity = note.get('velocity', 80)

        freq = midi_pitch_to_freq(pitch)
        note_audio = synthesize_note(freq, duration, velocity, sample_rate)

        start_sample = int(start_time * sample_rate)
        end_sample = min(start_sample + len(note_audio), total_samples)
        note_len = end_sample - start_sample

        if note_len > 0:
            audio[start_sample:end_sample] += note_audio[:note_len]

    audio = audio / np.max(np.abs(audio)) if np.max(np.abs(audio)) > 0 else audio
    audio_int16 = (audio * 32767).astype(np.int16)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    wavfile.write(output_path, sample_rate, audio_int16)


def wav_to_mp3(wav_path: str, mp3_path: str) -> bool:
    try:
        result = subprocess.run(
            ['ffmpeg', '-y', '-i', wav_path, '-codec:a', 'libmp3lame', '-q:a', '2', mp3_path],
            capture_output=True,
            timeout=30
        )
        if result.returncode == 0 and os.path.exists(mp3_path):
            return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    try:
        result = subprocess.run(
            ['lame', '--quiet', '-V', '2', wav_path, mp3_path],
            capture_output=True,
            timeout=30
        )
        if result.returncode == 0 and os.path.exists(mp3_path):
            return True
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    return False


def get_audio_duration(audio_path: str) -> float:
    try:
        sample_rate, audio_data = wavfile.read(audio_path)
        return len(audio_data) / sample_rate
    except Exception:
        return 0.0


def file_to_base64(file_path: str) -> str:
    with open(file_path, 'rb') as f:
        return base64.b64encode(f.read()).decode('utf-8')


def base64_to_file(b64_data: str, output_path: str) -> None:
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, 'wb') as f:
        f.write(base64.b64decode(b64_data))
