from pydantic import BaseModel, Field
from typing import List, Optional, Dict
from datetime import datetime
import uuid
from enum import Enum


class QuestionType(str, Enum):
    SINGLE_CHOICE = "single_choice"
    MULTIPLE_CHOICE = "multiple_choice"


class Question(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    text: str
    type: QuestionType
    options: List[str]
    required: bool = True


class QuestionCreate(BaseModel):
    text: str
    type: QuestionType
    options: List[str]
    required: bool = True


class Survey(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: Optional[str] = None
    creator_id: str
    created_at: datetime = Field(default_factory=datetime.now)
    questions: List[Question] = []
    is_active: bool = True


class SurveyCreate(BaseModel):
    title: str
    description: Optional[str] = None
    creator_id: str
    questions: List[QuestionCreate]


class SurveyResponse(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    survey_id: str
    respondent_id: Optional[str] = None
    answers: Dict[str, List[str]]
    submitted_at: datetime = Field(default_factory=datetime.now)


class AnswerCreate(BaseModel):
    question_id: str
    selected_options: List[str]


class SurveyResponseCreate(BaseModel):
    survey_id: str
    respondent_id: Optional[str] = None
    answers: List[AnswerCreate]


class QuestionStats(BaseModel):
    question_id: str
    question_text: str
    question_type: QuestionType
    total_responses: int
    option_counts: Dict[str, int]
    option_percentages: Dict[str, float]


class SurveyStats(BaseModel):
    survey_id: str
    survey_title: str
    total_responses: int
    question_stats: List[QuestionStats]
