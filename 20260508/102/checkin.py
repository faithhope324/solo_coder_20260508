from datetime import datetime, date, timedelta
from models import db, User, Checkin
from points_system import PointsSystem


class CheckinSystem:
    BASE_POINTS = 10
    MAX_CONSECUTIVE_BONUS = 50
    MAKEUP_COST = 20

    @staticmethod
    def _calculate_bonus(consecutive_days):
        if consecutive_days <= 0:
            return 0
        bonus = (consecutive_days - 1) * 5
        return min(bonus, CheckinSystem.MAX_CONSECUTIVE_BONUS)

    @staticmethod
    def _get_consecutive_days(user_id, current_date):
        checkins = Checkin.query.filter_by(user_id=user_id)\
            .order_by(Checkin.checkin_date.desc()).all()
        if not checkins:
            return 0

        checkin_dates = {c.checkin_date for c in checkins}
        consecutive = 0
        check_date = current_date - timedelta(days=1)

        while check_date in checkin_dates:
            consecutive += 1
            check_date -= timedelta(days=1)

        return consecutive

    @staticmethod
    def do_checkin(user_id, check_date=None):
        if check_date is None:
            check_date = date.today()

        user = User.query.get(user_id)
        if not user:
            return None, "用户不存在"

        existing = Checkin.query.filter_by(
            user_id=user_id,
            checkin_date=check_date
        ).first()
        if existing:
            return None, "该日期已签到"

        if check_date > date.today():
            return None, "不能签到未来日期"

        consecutive = CheckinSystem._get_consecutive_days(user_id, check_date)
        bonus = CheckinSystem._calculate_bonus(consecutive)
        total_points = CheckinSystem.BASE_POINTS + bonus

        checkin = Checkin(
            user_id=user_id,
            checkin_date=check_date,
            is_makeup=False
        )
        db.session.add(checkin)

        PointsSystem.add_points(
            user_id,
            total_points,
            f"签到奖励 - {check_date.strftime('%Y-%m-%d')}（连续{consecutive + 1}天）"
        )

        db.session.commit()

        return {
            'points': total_points,
            'base': CheckinSystem.BASE_POINTS,
            'bonus': bonus,
            'consecutive_days': consecutive + 1,
            'date': check_date.strftime('%Y-%m-%d')
        }, None

    @staticmethod
    def makeup_checkin(user_id, check_date):
        user = User.query.get(user_id)
        if not user:
            return None, "用户不存在"

        if check_date >= date.today():
            return None, "只能补签过去的日期"

        existing = Checkin.query.filter_by(
            user_id=user_id,
            checkin_date=check_date
        ).first()
        if existing:
            return None, "该日期已签到"

        if user.points < CheckinSystem.MAKEUP_COST:
            return None, f"积分不足，补签需要{CheckinSystem.MAKEUP_COST}积分"

        checkin = Checkin(
            user_id=user_id,
            checkin_date=check_date,
            is_makeup=True
        )
        db.session.add(checkin)

        PointsSystem.deduct_points(
            user_id,
            CheckinSystem.MAKEUP_COST,
            f"补签 - {check_date.strftime('%Y-%m-%d')}"
        )

        db.session.commit()

        return {
            'cost': CheckinSystem.MAKEUP_COST,
            'date': check_date.strftime('%Y-%m-%d'),
            'remaining_points': user.points
        }, None

    @staticmethod
    def get_user_checkins(user_id, year=None, month=None):
        query = Checkin.query.filter_by(user_id=user_id)
        if year and month:
            query = query.filter(
                db.extract('year', Checkin.checkin_date) == year,
                db.extract('month', Checkin.checkin_date) == month
            )
        checkins = query.order_by(Checkin.checkin_date.desc()).all()
        return [{
            'date': c.checkin_date.strftime('%Y-%m-%d'),
            'is_makeup': c.is_makeup,
            'time': c.created_at.strftime('%H:%M:%S')
        } for c in checkins]

    @staticmethod
    def has_checked_today(user_id):
        today = date.today()
        return Checkin.query.filter_by(
            user_id=user_id,
            checkin_date=today
        ).first() is not None

    @staticmethod
    def get_streak(user_id):
        checkins = Checkin.query.filter_by(user_id=user_id)\
            .order_by(Checkin.checkin_date.desc()).all()
        if not checkins:
            return 0

        checkin_dates = {c.checkin_date for c in checkins}
        streak = 0
        check_date = date.today()

        if check_date not in checkin_dates:
            check_date -= timedelta(days=1)

        while check_date in checkin_dates:
            streak += 1
            check_date -= timedelta(days=1)

        return streak
