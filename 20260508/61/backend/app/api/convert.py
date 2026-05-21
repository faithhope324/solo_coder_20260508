from fastapi import APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse

from app.services.audio_converter import AudioConverter
from app.db.schemas import ConvertRequest, ConvertResponse

router = APIRouter()
audio_converter = AudioConverter()


@router.post("/mp3", response_model=ConvertResponse)
async def convert_midi_to_mp3(request: ConvertRequest):
    try:
        result = await audio_converter.convert_midi_b64_to_audio(
            midi_b64=request.midiData,
            notes=[n.dict() for n in request.notes],
            duration=request.duration
        )

        return ConvertResponse(
            success=True,
            mp3Data=result['mp3_data'],
            isMp3=result['is_mp3']
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/upload")
async def convert_uploaded_midi(file: UploadFile = File(...)):
    try:
        if not file.filename.endswith('.mid') and not file.filename.endswith('.midi'):
            raise HTTPException(status_code=400, detail="Please upload a MIDI file")

        result = await audio_converter.midi_to_audio_from_upload(file)

        return {
            "success": True,
            "taskId": result['taskId'],
            "mp3Data": result['mp3_data'],
            "isMp3": result['is_mp3']
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{file_type}/{task_id}")
async def download_file(file_type: str, task_id: str):
    import os
    temp_dir = os.path.join(os.path.dirname(__file__), "..", "..", "temp")

    if file_type == 'midi':
        file_path = os.path.join(temp_dir, f"{task_id}.mid")
        media_type = 'audio/midi'
        filename = f"{task_id}.mid"
    elif file_type == 'mp3':
        file_path = os.path.join(temp_dir, f"{task_id}.mp3")
        if not os.path.exists(file_path):
            file_path = os.path.join(temp_dir, f"{task_id}.wav")
            media_type = 'audio/wav'
            filename = f"{task_id}.wav"
        else:
            media_type = 'audio/mpeg'
            filename = f"{task_id}.mp3"
    elif file_type == 'wav':
        file_path = os.path.join(temp_dir, f"{task_id}.wav")
        media_type = 'audio/wav'
        filename = f"{task_id}.wav"
    else:
        raise HTTPException(status_code=400, detail="Invalid file type")

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        file_path,
        media_type=media_type,
        filename=filename
    )
