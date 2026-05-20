import asyncio
import os
import tempfile
from pathlib import Path
from typing import Callable, List, Optional
import numpy as np
import soundfile as sf
import torch
from demucs import pretrained
from demucs.apply import apply_model
from demucs.audio import AudioFile, save_audio


class AudioSeparator:
    def __init__(self, model_name: str = "htdemucs", device: str = None):
        self.model_name = model_name
        if device is None:
            device = "cuda" if torch.cuda.is_available() else "cpu"
        self.device = device
        self.model = None
        self._load_model()

    def _load_model(self):
        print(f"Loading Demucs model: {self.model_name} on {self.device}...")
        self.model = pretrained.get_model(self.model_name)
        self.model.to(self.device)
        self.model.eval()
        print(f"Model loaded successfully. Sources: {self.model.sources}")

    @property
    def sources(self) -> List[str]:
        if self.model is None:
            return []
        return self.model.sources

    async def separate_file(
        self,
        input_path: str,
        output_dir: str,
        progress_callback: Optional[Callable[[float, str], None]] = None,
        segment_duration: float = 10.0
    ) -> dict:
        if self.model is None:
            raise RuntimeError("Model not loaded")

        if progress_callback:
            await progress_callback(0.05, "Loading audio file...")

        audio_file = AudioFile(input_path)
        wav = audio_file.read(streams=self.model.audio_channels,
                              samplerate=self.model.samplerate)
        wav = wav.to(self.device)

        total_duration = wav.shape[-1] / self.model.samplerate
        total_segments = max(1, int(np.ceil(total_duration / segment_duration)))

        if progress_callback:
            await progress_callback(0.1, f"Audio loaded. Duration: {total_duration:.1f}s, Processing in {total_segments} segments...")

        ref = wav.mean(0)
        wav = (wav - ref.mean()) / ref.std()

        segment_length = int(segment_duration * self.model.samplerate)
        total_samples = wav.shape[-1]

        all_sources = None

        for seg_idx in range(total_segments):
            start = seg_idx * segment_length
            end = min(start + segment_length, total_samples)
            segment = wav[:, start:end]

            if progress_callback:
                seg_progress = 0.1 + 0.8 * (seg_idx / total_segments)
                await progress_callback(
                    seg_progress,
                    f"Processing segment {seg_idx + 1}/{total_segments}..."
                )

            with torch.no_grad():
                sources = apply_model(
                    self.model,
                    segment.unsqueeze(0),
                    device=self.device,
                    split=True,
                    overlap=0.25,
                    progress=False
                )[0]

            if all_sources is None:
                all_sources = torch.zeros(
                    (sources.shape[0], sources.shape[1], total_samples),
                    device=self.device
                )
            all_sources[:, :, start:end] = sources

        if progress_callback:
            await progress_callback(0.9, "Saving separated tracks...")

        all_sources = all_sources * ref.std() + ref.mean()

        os.makedirs(output_dir, exist_ok=True)
        output_files = {}

        for source_idx, source_name in enumerate(self.model.sources):
            output_path = os.path.join(output_dir, f"{source_name}.wav")
            save_audio(
                all_sources[source_idx].cpu(),
                output_path,
                samplerate=self.model.samplerate
            )
            output_files[source_name] = output_path

        if progress_callback:
            await progress_callback(1.0, "Separation complete!")

        return {
            "sources": self.model.sources,
            "files": output_files,
            "duration": total_duration,
            "sample_rate": self.model.samplerate
        }


_separator_instance: Optional[AudioSeparator] = None


def get_separator() -> AudioSeparator:
    global _separator_instance
    if _separator_instance is None:
        _separator_instance = AudioSeparator()
    return _separator_instance
