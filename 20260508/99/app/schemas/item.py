from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class ItemCreate(BaseModel):
    title: str
    description: str = ""
    price: float
    category: str = "其他"


class ItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    is_sold: Optional[int] = None


class ItemOut(BaseModel):
    id: int
    title: str
    description: str
    price: float
    category: str
    image_url: str
    owner_id: int
    is_sold: int
    created_at: datetime
    owner_name: str = ""

    class Config:
        from_attributes = True
