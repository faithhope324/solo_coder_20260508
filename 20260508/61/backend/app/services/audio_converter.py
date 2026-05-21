import os
import uuid
from typing import Dict, Any, Optional
from fastapi import UploadFile

from app.utils.audio_utils import midi_to_wav, wav_to_mp3, file_to_base64
from app.utils.midi_utils import parse_midi_file


class AudioConverter:
    def __init__(self):
        self.temp_dir = os.path.join(os.path.dirname(__file__), "..", "..", "temp")
        os.makedirs(self.temp_dir, exist_ok=True)

    async def convert_midi_to_audio(
        self,
        midi_path: str,
        notes: list,
        duration: float = 30.0,
        task_id: Optional[str] = None
    ) -> Dict[str, Any]:
        if task_id is None:
            task_id = str(uuid.uuid4())

        wav_filename = f"{task_id}.wav"
        wav_path = os.path.join(self.temp_dir, wav_filename)

        mp3_filename = f"{task_id}.mp3"
        mp3_path = os.path.join(self.temp_dir, mp3_filename)

        notes_for_render = [
            {
                'pitch': n.get('pitch', n.get('note', 60)),
                'start_time': n.get('start', n.get('start_time', 0)),
                'duration': n.get('duration', 0.5),
                'velocity': n.get('velocity', 80)
            }
            for n in notes
        ]

        midi_to_wav(notes_for_render, wav_path, total_duration=duration)

        mp3_success = wav_to_mp3(wav_path, mp3_path)

        wav_data = file_to_base64(wav_path)
        mp3_data = file_to_base64(mp3_path) if mp3_success else None

        return {
            "taskId": task_id,
            "wav_path": wav_path,
            "mp3_path": mp3_path if mp3_success else wav_path,
            "wav_data": wav_data,
            "mp3_data": mp3_data if mp3_data else wav_data,
            "is_mp3": mp3_success,
            "success": True
        }

    async def midi_to_audio_from_upload(self, file: UploadFile) -> Dict[str, Any]:
        task_id = str(uuid.uuid4())
        midi_filename = f"{task_id}.mid"
        midi_path = os.path.join(self.temp_dir, midi_filename)

        contents = await file.read()
        with open(midi_path, "wb") as f:
            f.write(contents)

        notes = parse_midi_file(midi_path)
        max_end = max([n['end_time'] for n in notes], default=30)

        return await self.convert_midi_to_audio(
            midi_path=midi_path,
            notes=notes,
            duration=max_end + 1,
            task_id=task_id
        )

    async def convert_midi_b64_to_audio(
        self,
        midi_b64: str,
        notes: list,
        duration: float = 30.0,
        task_id: Optional[str] = None
    ) -> Dict[str, Any]:
        if task_id is None:
            task_id = str(uuid.uuid4())

        midi_filename = f"{task_id}.mid"
        midi_path = os.path.join(self.temp_dir, midi_filename)

        import base64
        with open(midi_path, 'wb') as f:
            f.write(base64.b64decode(midi_b64))

        return await self.convert_midi_to_audio(
            midi_path=midi_path,
            notes=notes,
            duration=duration,
            task_id=task_id
        )
