from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class MessageCreate(BaseModel):
    receiver_id: int
    content: str
    item_id: Optional[int] = None


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    item_id: Optional[int]
    content: str
    is_read: int
    created_at: datetime
    sender_name: str = ""
    receiver_name: str = ""

    class Config:
        from_attributes = True
