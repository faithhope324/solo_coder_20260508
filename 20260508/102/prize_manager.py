from datetime import datetime
from models import db, Prize, Exchange
from points_system import PointsSystem


class PrizeManager:
    @staticmethod
    def create_prize(name, description, points_required, stock=999, is_active=True):
        prize = Prize(
            name=name,
            description=description,
            points_required=points_required,
            stock=stock,
            is_active=is_active
        )
        db.session.add(prize)
        db.session.commit()
        return prize

    @staticmethod
    def update_prize(prize_id, name=None, description=None, points_required=None, stock=None, is_active=None):
        prize = Prize.query.get(prize_id)
        if not prize:
            return None, "奖品不存在"
        if name is not None:
            prize.name = name
        if description is not None:
            prize.description = description
        if points_required is not None:
            prize.points_required = points_required
        if stock is not None:
            prize.stock = stock
        if is_active is not None:
            prize.is_active = is_active
        db.session.commit()
        return prize, None

    @staticmethod
    def delete_prize(prize_id):
        prize = Prize.query.get(prize_id)
        if not prize:
            return False, "奖品不存在"
        db.session.delete(prize)
        db.session.commit()
        return True, None

    @staticmethod
    def get_prize(prize_id):
        return Prize.query.get(prize_id)

    @staticmethod
    def get_all_prizes(include_inactive=False):
        query = Prize.query
        if not include_inactive:
            query = query.filter_by(is_active=True)
        return query.order_by(Prize.points_required.asc()).all()

    @staticmethod
    def exchange_prize(user_id, prize_id):
        prize = Prize.query.get(prize_id)
        if not prize:
            return None, "奖品不存在"
        if not prize.is_active:
            return None, "奖品已下架"
        if prize.stock <= 0:
            return None, "奖品库存不足"

        balance, err = PointsSystem.get_balance(user_id)
        if err:
            return None, err
        if balance < prize.points_required:
            return None, f"积分不足，需要{prize.points_required}积分"

        exchange = Exchange(user_id=user_id, prize_id=prize_id)
        db.session.add(exchange)

        PointsSystem.deduct_points(
            user_id,
            prize.points_required,
            f"兑换奖品 - {prize.name}"
        )

        prize.stock -= 1
        db.session.commit()

        return {
            'exchange_id': exchange.id,
            'prize_name': prize.name,
            'points_spent': prize.points_required,
            'remaining_points': balance - prize.points_required,
            'time': exchange.created_at.strftime('%Y-%m-%d %H:%M:%S')
        }, None

    @staticmethod
    def get_user_exchanges(user_id, limit=20):
        exchanges = Exchange.query.filter_by(user_id=user_id)\
            .order_by(Exchange.created_at.desc())\
            .limit(limit).all()
        return [{
            'id': e.id,
            'prize_name': e.prize.name,
            'prize_description': e.prize.description,
            'points_spent': e.prize.points_required,
            'time': e.created_at.strftime('%Y-%m-%d %H:%M:%S')
        } for e in exchanges]
