import json
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session

from app.services.music_generator import MusicGenerator
from app.services.audio_converter import AudioConverter
from app.db.schemas import GenerateRequest, GenerateResponse
from app.db.database import get_db
from app.db.models import GenerationTask

router = APIRouter()
music_generator = MusicGenerator()
audio_converter = AudioConverter()


@router.post("/", response_model=GenerateResponse)
async def generate_music(request: GenerateRequest, db: Session = Depends(get_db)):
    try:
        if request.style not in ['jazz', 'classical', 'electronic']:
            raise HTTPException(status_code=400, detail="Invalid style. Must be jazz, classical, or electronic")

        gen_result = await music_generator.generate(
            style=request.style,
            start_notes=request.startNotes,
            midi_file_b64=request.midiFile,
            duration=request.duration,
            temperature=request.temperature,
            seed=request.seed
        )

        conv_result = await audio_converter.convert_midi_to_audio(
            midi_path=gen_result['midi_path'],
            notes=gen_result['notes'],
            duration=gen_result['duration'],
            task_id=gen_result['taskId']
        )

        task = GenerationTask(
            task_id=gen_result['taskId'],
            style=request.style,
            start_notes=json.dumps(request.startNotes) if request.startNotes else None,
            duration=request.duration,
            temperature=request.temperature,
            midi_path=gen_result['midi_path'],
            mp3_path=conv_result['mp3_path'],
            note_data=json.dumps(gen_result['notes']),
            tempo=gen_result['tempo']
        )
        db.add(task)
        db.commit()
        db.refresh(task)

        return GenerateResponse(
            success=True,
            taskId=gen_result['taskId'],
            midiData=gen_result['midi_data'],
            mp3Data=conv_result['mp3_data'],
            notes=gen_result['notes'],
            duration=gen_result['duration'],
            tempo=gen_result['tempo'],
            style=gen_result['style'],
            isMp3=conv_result['is_mp3']
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{task_id}")
async def get_generate_status(task_id: str, db: Session = Depends(get_db)):
    task = db.query(GenerationTask).filter(GenerationTask.task_id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {
        "task_id": task_id,
        "status": "completed",
        "style": task.style,
        "duration": task.duration,
        "created_at": task.created_at
    }
