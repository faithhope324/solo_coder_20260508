from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from parking_manager import parking_manager
import models
import schemas

router = APIRouter(prefix="/api/parking", tags=["车位"])


@router.get("/spots", response_model=list[schemas.SpotResponse])
def get_all_spots():
    return parking_manager.get_all_spots()


@router.get("/spots/{spot_id}", response_model=schemas.SpotResponse)
def get_spot(spot_id: str):
    spot = parking_manager.get_spot(spot_id)
    if spot is None:
        raise HTTPException(status_code=404, detail="车位不存在")
    return spot