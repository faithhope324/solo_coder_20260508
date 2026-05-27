from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_admin
from orders import OrderService
import models
import schemas

router = APIRouter(prefix="/api/admin", tags=["管理员"])


@router.get("/orders", response_model=list[schemas.OrderResponse])
def list_all_orders(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin),
):
    return OrderService.list_orders(db, user_id=None, skip=skip, limit=limit)


@router.get("/revenue", response_model=schemas.RevenueStats)
def revenue_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin),
):
    return OrderService.get_revenue_stats(db)