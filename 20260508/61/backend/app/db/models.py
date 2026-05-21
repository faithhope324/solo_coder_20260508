from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base


class GenerationTask(Base):
    __tablename__ = "generation_task"

    task_id = Column(String, primary_key=True, index=True)
    style = Column(String, nullable=False)
    start_notes = Column(Text, nullable=True)
    duration = Column(Integer, nullable=False, default=30)
    temperature = Column(Float, nullable=False, default=0.8)
    created_at = Column(DateTime, default=datetime.utcnow)
    midi_path = Column(String, nullable=True)
    mp3_path = Column(String, nullable=True)
    note_data = Column(Text, nullable=True)
    tempo = Column(Integer, nullable=True)

    feedbacks = relationship("UserFeedback", back_populates="task")


class UserFeedback(Base):
    __tablename__ = "user_feedback"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    task_id = Column(String, ForeignKey("generation_task.task_id"), nullable=False)
    rating = Column(String, nullable=False)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("GenerationTask", back_populates="feedbacks")
