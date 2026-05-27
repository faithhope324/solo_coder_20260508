from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
import models


class OrderService:
    @staticmethod
    def list_orders(db: Session, user_id: int = None, skip: int = 0, limit: int = 50) -> list[models.Order]:
        query = db.query(models.Order)
        if user_id is not None:
            query = query.filter(models.Order.user_id == user_id)
        return query.order_by(models.Order.id.desc()).offset(skip).limit(limit).all()

    @staticmethod
    def get_revenue_stats(db: Session) -> dict:
        total_revenue = (
            db.query(func.coalesce(func.sum(models.Order.amount), 0.0))
            .filter(models.Order.status == "completed")
            .scalar()
        )
        total_orders = (
            db.query(func.count(models.Order.id))
            .filter(models.Order.status == "completed")
            .scalar()
        )
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_revenue = (
            db.query(func.coalesce(func.sum(models.Order.amount), 0.0))
            .filter(
                models.Order.status == "completed",
                models.Order.ended_at >= today_start,
            )
            .scalar()
        )
        today_orders = (
            db.query(func.count(models.Order.id))
            .filter(
                models.Order.status == "completed",
                models.Order.ended_at >= today_start,
            )
            .scalar()
        )
        return {
            "total_revenue": round(float(total_revenue or 0), 2),
            "total_orders": int(total_orders or 0),
            "today_revenue": round(float(today_revenue or 0), 2),
            "today_orders": int(today_orders or 0),
        }