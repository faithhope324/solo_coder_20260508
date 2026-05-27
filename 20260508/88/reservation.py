from datetime import datetime
from sqlalchemy.orm import Session
from parking_manager import parking_manager
import models


class ReservationService:
    @staticmethod
    def reserve(db: Session, user_id: int, spot_id: str) -> dict:
        spot = parking_manager.reserve_spot(spot_id, str(user_id))
        order = models.Order(
            user_id=user_id,
            spot_id=spot_id,
            status="reserved",
            amount=0.0,
            reserved_at=datetime.utcnow(),
        )
        db.add(order)
        db.commit()
        db.refresh(order)
        return {
            "order_id": order.id,
            "spot": {
                "spot_id": spot.spot_id,
                "status": spot.status,
                "expires_at": spot.expires_at,
            },
        }

    @staticmethod
    def confirm(db: Session, user_id: int, spot_id: str) -> dict:
        spot = parking_manager.confirm_parking(spot_id, str(user_id))
        order = (
            db.query(models.Order)
            .filter(
                models.Order.user_id == user_id,
                models.Order.spot_id == spot_id,
                models.Order.status == "reserved",
            )
            .order_by(models.Order.id.desc())
            .first()
        )
        if order:
            order.status = "active"
            order.started_at = datetime.utcnow()
            db.commit()
            db.refresh(order)
        return {
            "order_id": order.id if order else None,
            "spot": {
                "spot_id": spot.spot_id,
                "status": spot.status,
            },
        }

    @staticmethod
    def leave(db: Session, user_id: int, spot_id: str, hourly_rate: float) -> dict:
        order = (
            db.query(models.Order)
            .filter(
                models.Order.user_id == user_id,
                models.Order.spot_id == spot_id,
                models.Order.status == "active",
            )
            .order_by(models.Order.id.desc())
            .first()
        )
        spot = parking_manager.leave_spot(spot_id, str(user_id))

        if order and order.started_at:
            ended_at = datetime.utcnow()
            duration = (ended_at - order.started_at).total_seconds() / 60.0
            amount = round((duration / 60.0) * hourly_rate, 2)
            order.ended_at = ended_at
            order.duration_minutes = int(duration)
            order.amount = amount
            order.status = "completed"
            db.commit()
            db.refresh(order)

        return {
            "order_id": order.id if order else None,
            "amount": order.amount if order else 0,
            "duration_minutes": order.duration_minutes if order else 0,
            "spot": {
                "spot_id": spot.spot_id,
                "status": spot.status,
            },
        }