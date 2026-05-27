from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None


class UserCreate(BaseModel):
    username: str
    password: str
    role: Optional[str] = "user"


class UserLogin(BaseModel):
    username: str
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    role: str

    class Config:
        from_attributes = True


class SpotResponse(BaseModel):
    spot_id: str
    status: str
    user_id: Optional[str] = None
    reserved_at: Optional[float] = None
    expires_at: Optional[float] = None


class ReserveRequest(BaseModel):
    spot_id: str


class OrderResponse(BaseModel):
    id: int
    user_id: int
    spot_id: str
    status: str
    amount: float
    reserved_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_minutes: int

    class Config:
        from_attributes = True


class RevenueStats(BaseModel):
    total_revenue: float
    total_orders: int
    today_revenue: float
    today_orders: int