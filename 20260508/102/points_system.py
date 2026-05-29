from datetime import datetime
from models import db, User, PointRecord


class PointsSystem:
    @staticmethod
    def add_points(user_id, points, reason):
        user = User.query.get(user_id)
        if not user:
            return None, "用户不存在"
        user.points += points
        record = PointRecord(
            user_id=user_id,
            points=points,
            reason=reason
        )
        db.session.add(record)
        db.session.commit()
        return user.points, None

    @staticmethod
    def deduct_points(user_id, points, reason):
        user = User.query.get(user_id)
        if not user:
            return None, "用户不存在"
        if user.points < points:
            return None, "积分不足"
        user.points -= points
        record = PointRecord(
            user_id=user_id,
            points=-points,
            reason=reason
        )
        db.session.add(record)
        db.session.commit()
        return user.points, None

    @staticmethod
    def get_balance(user_id):
        user = User.query.get(user_id)
        if not user:
            return None, "用户不存在"
        return user.points, None

    @staticmethod
    def get_history(user_id, limit=20):
        records = PointRecord.query.filter_by(user_id=user_id)\
            .order_by(PointRecord.created_at.desc())\
            .limit(limit).all()
        return [{
            'points': r.points,
            'reason': r.reason,
            'time': r.created_at.strftime('%Y-%m-%d %H:%M:%S')
        } for r in records]
