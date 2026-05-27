from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
from orders import OrderService
import models
import schemas

router = APIRouter(prefix="/api/orders", tags=["订单"])


@router.get("", response_model=list[schemas.OrderResponse])
def list_my_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return OrderService.list_orders(db, user_id=current_user.id, skip=skip, limit=limit)