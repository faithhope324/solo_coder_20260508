from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from config import settings
from reservation import ReservationService
import models
import schemas

router = APIRouter(prefix="/api/reservation", tags=["预订"])


@router.post("/reserve")
def reserve(
    req: schemas.ReserveRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        return ReservationService.reserve(db, current_user.id, req.spot_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/confirm")
def confirm(
    req: schemas.ReserveRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        return ReservationService.confirm(db, current_user.id, req.spot_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/leave")
def leave(
    req: schemas.ReserveRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        return ReservationService.leave(
            db, current_user.id, req.spot_id, settings.parking_hourly_rate
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))