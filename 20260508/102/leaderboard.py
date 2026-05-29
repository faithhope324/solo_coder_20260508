from models import User
from checkin import CheckinSystem


class Leaderboard:
    @staticmethod
    def get_points_leaderboard(limit=10):
        users = User.query.order_by(User.points.desc()).limit(limit).all()
        leaderboard = []
        for idx, user in enumerate(users, 1):
            streak = CheckinSystem.get_streak(user.id)
            leaderboard.append({
                'rank': idx,
                'user_id': user.id,
                'username': user.username,
                'points': user.points,
                'streak': streak,
                'is_admin': user.is_admin
            })
        return leaderboard

    @staticmethod
    def get_streak_leaderboard(limit=10):
        users = User.query.all()
        user_streaks = []
        for user in users:
            streak = CheckinSystem.get_streak(user.id)
            user_streaks.append({
                'user_id': user.id,
                'username': user.username,
                'points': user.points,
                'streak': streak,
                'is_admin': user.is_admin
            })
        user_streaks.sort(key=lambda x: x['streak'], reverse=True)
        for idx, item in enumerate(user_streaks[:limit], 1):
            item['rank'] = idx
        return user_streaks[:limit]

    @staticmethod
    def get_user_rank(user_id):
        leaderboard = Leaderboard.get_points_leaderboard(limit=1000)
        for item in leaderboard:
            if item['user_id'] == user_id:
                return item['rank']
        return None
