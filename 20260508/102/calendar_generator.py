import calendar
from datetime import date, datetime
from checkin import CheckinSystem


class CalendarGenerator:
    WEEKDAY_NAMES = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

    @staticmethod
    def generate_month_calendar(user_id, year=None, month=None):
        today = date.today()
        if year is None:
            year = today.year
        if month is None:
            month = today.month

        cal = calendar.Calendar(firstweekday=0)
        month_days = cal.monthdatescalendar(year, month)

        checkins = CheckinSystem.get_user_checkins(user_id, year, month)
        checkin_dates = {}
        for c in checkins:
            checkin_dates[c['date']] = c

        calendar_data = []
        for week in month_days:
            week_data = []
            for day in week:
                day_str = day.strftime('%Y-%m-%d')
                is_current_month = day.month == month
                is_today = day == today
                is_checked = day_str in checkin_dates
                is_makeup = is_checked and checkin_dates[day_str]['is_makeup']
                is_future = day > today

                week_data.append({
                    'date': day_str,
                    'day': day.day,
                    'is_current_month': is_current_month,
                    'is_today': is_today,
                    'is_checked': is_checked,
                    'is_makeup': is_makeup,
                    'is_future': is_future,
                    'can_makeup': is_current_month and is_future is False and not is_checked and day < today
                })
            calendar_data.append(week_data)

        return {
            'year': year,
            'month': month,
            'month_name': f'{year}年{month}月',
            'weekdays': CalendarGenerator.WEEKDAY_NAMES,
            'weeks': calendar_data,
            'today': today.strftime('%Y-%m-%d'),
            'prev_month': CalendarGenerator._get_prev_month(year, month),
            'next_month': CalendarGenerator._get_next_month(year, month),
            'checkin_count': len([d for d in checkin_dates if datetime.strptime(d, '%Y-%m-%d').month == month]),
            'total_days': calendar.monthrange(year, month)[1]
        }

    @staticmethod
    def _get_prev_month(year, month):
        if month == 1:
            return {'year': year - 1, 'month': 12}
        return {'year': year, 'month': month - 1}

    @staticmethod
    def _get_next_month(year, month):
        if month == 12:
            return {'year': year + 1, 'month': 1}
        return {'year': year, 'month': month + 1}
