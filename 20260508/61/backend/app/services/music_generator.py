import os
import uuid
import random
import base64
import math
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

import numpy as np
from app.utils.midi_utils import generate_midi_from_notes, parse_midi_file


@dataclass
class Note:
    pitch: int
    start: float
    duration: float
    velocity: int


class MusicGenerator:
    def __init__(self):
        self.temp_dir = os.path.join(os.path.dirname(__file__), "..", "..", "temp")
        os.makedirs(self.temp_dir, exist_ok=True)

        self.scales = {
            'jazz': [0, 2, 3, 5, 7, 9, 10, 12],
            'classical': [0, 2, 4, 5, 7, 9, 11, 12],
            'electronic': [0, 2, 3, 5, 7, 8, 10, 12]
        }

        self.chord_progressions = {
            'jazz': [
                [0, 4, 7, 10],
                [5, 9, 0, 3],
                [7, 11, 2, 5],
                [0, 4, 7, 10]
            ],
            'classical': [
                [0, 4, 7],
                [5, 9, 0],
                [7, 11, 2],
                [0, 4, 7]
            ],
            'electronic': [
                [0, 3, 7],
                [5, 8, 0],
                [7, 10, 2],
                [0, 3, 7]
            ]
        }

        self.style_tempos = {
            'jazz': 110,
            'classical': 80,
            'electronic': 128
        }

    async def generate(
        self,
        style: str,
        start_notes: Optional[List[int]] = None,
        midi_file_b64: Optional[str] = None,
        duration: int = 30,
        temperature: float = 0.8,
        seed: Optional[int] = None
    ) -> Dict[str, Any]:
        if seed is not None:
            random.seed(seed)
            np.random.seed(seed)

        task_id = str(uuid.uuid4())
        midi_filename = f"{task_id}.mid"
        midi_path = os.path.join(self.temp_dir, midi_filename)

        if midi_file_b64:
            seed_notes = self._parse_midi_seed(midi_file_b64)
        elif start_notes:
            seed_notes = [Note(pitch=n, start=0, duration=0.5, velocity=80) for n in start_notes]
        else:
            root_note = random.choice([60, 62, 64, 65, 67, 69, 71])
            seed_notes = [Note(pitch=root_note, start=0, duration=0.5, velocity=80)]

        tempo = self.style_tempos.get(style, 120)

        if style == 'jazz':
            notes = self._generate_jazz(seed_notes, duration, tempo, temperature)
        elif style == 'classical':
            notes = self._generate_classical(seed_notes, duration, tempo, temperature)
        elif style == 'electronic':
            notes = self._generate_electronic(seed_notes, duration, tempo, temperature)
        else:
            notes = self._generate_pop(seed_notes, duration, tempo, temperature)

        notes_dict = [
            {
                "pitch": n.pitch,
                "start_time": n.start,
                "duration": n.duration,
                "velocity": n.velocity
            }
            for n in notes
        ]

        generate_midi_from_notes(notes_dict, midi_path, tempo)

        with open(midi_path, 'rb') as f:
            midi_data = base64.b64encode(f.read()).decode('utf-8')

        notes_for_frontend = [
            {
                "pitch": n.pitch,
                "start": n.start,
                "duration": n.duration,
                "velocity": n.velocity
            }
            for n in notes
        ]

        return {
            "taskId": task_id,
            "midi_path": midi_path,
            "midi_data": midi_data,
            "notes": notes_for_frontend,
            "duration": duration,
            "tempo": tempo,
            "style": style,
            "success": True
        }

    def _parse_midi_seed(self, midi_b64: str) -> List[Note]:
        midi_bytes = base64.b64decode(midi_b64)
        temp_path = os.path.join(self.temp_dir, f"seed_{uuid.uuid4()}.mid")
        with open(temp_path, 'wb') as f:
            f.write(midi_bytes)

        parsed = parse_midi_file(temp_path)
        notes = []
        for n in parsed[:10]:
            notes.append(Note(
                pitch=n['pitch'],
                start=n['start_time'],
                duration=n['duration'],
                velocity=n['velocity']
            ))

        os.remove(temp_path)
        return notes if notes else [Note(pitch=60, start=0, duration=0.5, velocity=80)]

    def _generate_jazz(
        self, seed_notes: List[Note], duration: int, tempo: int, temperature: float
    ) -> List[Note]:
        notes = []
        beat_duration = 60.0 / tempo
        total_beats = int(duration / beat_duration)
        scale = self.scales['jazz']
        chords = self.chord_progressions['jazz']

        root = seed_notes[0].pitch % 12

        seed_end_time = max((n.start + n.duration) for n in seed_notes)
        for seed_note in seed_notes:
            if seed_note.start < duration:
                adj_duration = min(seed_note.duration, duration - seed_note.start)
                if adj_duration > 0:
                    notes.append(Note(
                        pitch=seed_note.pitch,
                        start=seed_note.start,
                        duration=adj_duration,
                        velocity=seed_note.velocity
                    ))

        current_time = seed_end_time

        num_bars = math.ceil(total_beats / 4)
        for bar in range(num_bars):
            if current_time >= duration:
                break

            chord = chords[bar % len(chords)]
            chord_notes = [(root + n) % 12 for n in chord]

            for beat in range(4):
                if current_time >= duration:
                    break

                if random.random() < 0.7:
                    is_swing = beat % 2 == 1
                    swing_offset = beat_duration * 0.15 if is_swing else 0

                    note_start = current_time + swing_offset
                    if note_start >= duration:
                        current_time += beat_duration
                        continue

                    max_note_duration = duration - note_start
                    note_duration = min(beat_duration * random.uniform(0.3, 0.8), max_note_duration)

                    if note_duration <= 0:
                        current_time += beat_duration
                        continue

                    if random.random() < 0.3 * temperature:
                        pitch = random.choice(chord_notes) + 60 + random.choice([-12, 0, 12])
                    else:
                        pitch = random.choice(scale) + root + 60

                    velocity = int(80 + random.uniform(-20, 20) * temperature)
                    velocity = max(40, min(120, velocity))

                    notes.append(Note(
                        pitch=pitch,
                        start=note_start,
                        duration=note_duration,
                        velocity=velocity
                    ))

                current_time += beat_duration

        return notes

    def _generate_classical(
        self, seed_notes: List[Note], duration: int, tempo: int, temperature: float
    ) -> List[Note]:
        notes = []
        beat_duration = 60.0 / tempo
        total_beats = int(duration / beat_duration)
        scale = self.scales['classical']
        chords = self.chord_progressions['classical']

        root = seed_notes[0].pitch % 12
        melody_direction = 1

        seed_end_time = max((n.start + n.duration) for n in seed_notes)
        for seed_note in seed_notes:
            if seed_note.start < duration:
                adj_duration = min(seed_note.duration, duration - seed_note.start)
                if adj_duration > 0:
                    notes.append(Note(
                        pitch=seed_note.pitch,
                        start=seed_note.start,
                        duration=adj_duration,
                        velocity=seed_note.velocity
                    ))

        current_time = seed_end_time

        num_bars = math.ceil(total_beats / 4)
        for bar in range(num_bars):
            if current_time >= duration:
                break

            chord = chords[bar % len(chords)]
            chord_notes = [(root + n) % 12 for n in chord]

            max_bass_duration = duration - current_time
            bass_duration = min(beat_duration * 4, max_bass_duration)
            if bass_duration > 0:
                bass_note = chord_notes[0] + 36
                notes.append(Note(
                    pitch=bass_note,
                    start=current_time,
                    duration=bass_duration,
                    velocity=70
                ))

            for beat in range(4):
                if current_time >= duration:
                    break

                note_pattern = [0, 2, 4, 2]
                scale_degree = note_pattern[beat]

                if random.random() < 0.2 * temperature:
                    scale_degree += random.choice([-1, 1])

                pitch = scale[scale_degree % len(scale)] + root + 60

                if bar % 4 == 3 and beat == 3:
                    pitch = root + 60

                pitch += melody_direction * random.choice([0, 12])
                if random.random() < 0.1:
                    melody_direction *= -1

                velocity = int(75 + random.uniform(-15, 15) * temperature)

                max_melody_duration = duration - current_time
                melody_duration = min(beat_duration * random.choice([0.9, 0.5, 1.5, 2]), max_melody_duration)
                if melody_duration > 0:
                    notes.append(Note(
                        pitch=pitch,
                        start=current_time,
                        duration=melody_duration,
                        velocity=velocity
                    ))

                current_time += beat_duration

        return notes

    def _generate_electronic(
        self, seed_notes: List[Note], duration: int, tempo: int, temperature: float
    ) -> List[Note]:
        notes = []
        beat_duration = 60.0 / tempo
        total_beats = int(duration / beat_duration)
        scale = self.scales['electronic']
        chords = self.chord_progressions['electronic']

        root = seed_notes[0].pitch % 12

        seed_end_time = max((n.start + n.duration) for n in seed_notes)
        for seed_note in seed_notes:
            if seed_note.start < duration:
                adj_duration = min(seed_note.duration, duration - seed_note.start)
                if adj_duration > 0:
                    notes.append(Note(
                        pitch=seed_note.pitch,
                        start=seed_note.start,
                        duration=adj_duration,
                        velocity=seed_note.velocity
                    ))

        current_time = seed_end_time

        num_bars = math.ceil(total_beats / 4)
        for bar in range(num_bars):
            if current_time >= duration:
                break

            chord = chords[bar % len(chords)]
            chord_notes = [(root + n) % 12 for n in chord]

            for i, cn in enumerate(chord_notes):
                note_start = current_time + i * beat_duration * 0.25
                if note_start < duration:
                    max_dur = duration - note_start
                    note_dur = min(beat_duration * 0.2, max_dur)
                    if note_dur > 0:
                        notes.append(Note(
                            pitch=cn + 48,
                            start=note_start,
                            duration=note_dur,
                            velocity=90
                        ))

            for beat in range(4):
                if current_time >= duration:
                    break

                beat_start = current_time + beat * beat_duration
                if beat_start >= duration:
                    continue

                if beat == 0 or beat == 2:
                    max_dur = duration - beat_start
                    note_dur = min(beat_duration * 0.15, max_dur)
                    if note_dur > 0:
                        notes.append(Note(
                            pitch=36,
                            start=beat_start,
                            duration=note_dur,
                            velocity=120
                        ))

                if beat == 1 or beat == 3:
                    max_dur = duration - beat_start
                    note_dur = min(beat_duration * 0.1, max_dur)
                    if note_dur > 0:
                        notes.append(Note(
                            pitch=42,
                            start=beat_start,
                            duration=note_dur,
                            velocity=100
                        ))

                if random.random() < 0.6:
                    sub_beat = random.random() * beat_duration
                    note_start = current_time + sub_beat
                    if note_start < duration:
                        if random.random() < 0.4 * temperature:
                            pitch = random.choice(scale) + root + 72
                        else:
                            pitch = random.choice(chord_notes) + 72

                        velocity = int(85 + random.uniform(-15, 15) * temperature)
                        max_dur = duration - note_start
                        note_dur = min(beat_duration * random.uniform(0.1, 0.4), max_dur)
                        if note_dur > 0:
                            notes.append(Note(
                                pitch=pitch,
                                start=note_start,
                                duration=note_dur,
                                velocity=velocity
                            ))

                if random.random() < 0.3 * temperature:
                    note_start = current_time + beat * beat_duration + beat_duration * 0.5
                    if note_start < duration:
                        arp_note = random.choice(scale) + root + 60
                        max_dur = duration - note_start
                        note_dur = min(beat_duration * 0.3, max_dur)
                        if note_dur > 0:
                            notes.append(Note(
                                pitch=arp_note,
                                start=note_start,
                                duration=note_dur,
                                velocity=80
                            ))

            current_time += beat_duration * 4

        return notes

    def _generate_pop(
        self, seed_notes: List[Note], duration: int, tempo: int, temperature: float
    ) -> List[Note]:
        notes = []
        beat_duration = 60.0 / tempo
        total_beats = int(duration / beat_duration)
        scale = [0, 2, 4, 5, 7, 9, 11, 12]

        root = seed_notes[0].pitch % 12

        seed_end_time = max((n.start + n.duration) for n in seed_notes)
        for seed_note in seed_notes:
            if seed_note.start < duration:
                adj_duration = min(seed_note.duration, duration - seed_note.start)
                if adj_duration > 0:
                    notes.append(Note(
                        pitch=seed_note.pitch,
                        start=seed_note.start,
                        duration=adj_duration,
                        velocity=seed_note.velocity
                    ))

        current_time = seed_end_time

        for i in range(total_beats):
            if current_time >= duration:
                break

            pitch = scale[i % len(scale)] + root + 60
            if random.random() < 0.2 * temperature:
                pitch += random.choice([-1, 1])

            max_dur = duration - current_time
            note_dur = min(beat_duration * 0.8, max_dur)
            if note_dur > 0:
                notes.append(Note(
                    pitch=pitch,
                    start=current_time,
                    duration=note_dur,
                    velocity=80
                ))
            current_time += beat_duration

        return notes
