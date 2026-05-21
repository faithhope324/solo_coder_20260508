import os
from typing import List, Dict, Any

from midiutil import MIDIFile
import pretty_midi


def generate_midi_from_notes(
    notes: List[Dict[str, Any]],
    output_path: str,
    tempo: int = 120
) -> None:
    midi = MIDIFile(1, deinterleave=False)
    track = 0
    channel = 0
    volume = 100

    midi.addTempo(track, 0, tempo)

    valid_notes = []
    for note in notes:
        pitch = int(note["pitch"])
        start_time = float(note["start_time"])
        duration = float(note["duration"])
        velocity = int(note.get("velocity", 80))

        if pitch < 0 or pitch > 127:
            continue
        if duration <= 0.02:
            continue
        if start_time < 0:
            continue

        velocity = max(1, min(127, velocity))
        pitch = max(0, min(127, pitch))

        valid_notes.append({
            "pitch": pitch,
            "start_time": start_time,
            "duration": duration,
            "velocity": velocity
        })

    valid_notes.sort(key=lambda n: (n["start_time"], n["pitch"]))

    last_end = {}
    filtered_notes = []
    for note in valid_notes:
        pitch = note["pitch"]
        start = note["start_time"]
        if pitch in last_end and start < last_end[pitch] + 0.001:
            start = last_end[pitch] + 0.001
            note["start_time"] = start
        last_end[pitch] = start + note["duration"]
        filtered_notes.append(note)

    seen = set()
    for note in filtered_notes:
        key = (note["pitch"], round(note["start_time"], 4))
        if key in seen:
            continue
        seen.add(key)
        midi.addNote(track, channel, note["pitch"], note["start_time"], note["duration"], note["velocity"])

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "wb") as output_file:
        midi.writeFile(output_file)


def parse_midi_file(midi_path: str) -> List[Dict[str, Any]]:
    notes = []
    midi_data = pretty_midi.PrettyMIDI(midi_path)

    for instrument in midi_data.instruments:
        for note in instrument.notes:
            notes.append({
                "pitch": note.pitch,
                "start_time": note.start,
                "end_time": note.end,
                "duration": note.end - note.start,
                "velocity": note.velocity,
                "instrument": instrument.name
            })

    return notes
