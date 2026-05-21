from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List


class Note(BaseModel):
    pitch: int
    start: float
    duration: float
    velocity: int


class GenerateRequest(BaseModel):
    style: str
    startNotes: Optional[List[int]] = None
    midiFile: Optional[str] = None
    duration: int = 30
    temperature: float = 0.8
    seed: Optional[int] = None


class GenerateResponse(BaseModel):
    success: bool
    taskId: str
    midiData: str
    mp3Data: str
    notes: List[Note]
    duration: int
    tempo: int
    style: str
    isMp3: bool


class FeedbackRequest(BaseModel):
    taskId: str
    rating: str
    comment: Optional[str] = None


class FeedbackResponse(BaseModel):
    success: bool
    message: str
    feedbackId: int


class ConvertRequest(BaseModel):
    midiData: str
    notes: List[Note]
    duration: int = 30


class ConvertResponse(BaseModel):
    success: bool
    mp3Data: str
    isMp3: bool


class TaskInfo(BaseModel):
    task_id: str
    style: str
    duration: int
    created_at: datetime

    class Config:
        from_attributes = True
