import os
from datetime import datetime, date
from flask import Flask, render_template, request, redirect, url_for, session, flash, jsonify
from models import db, User
from checkin import CheckinSystem
from points_system import PointsSystem
from calendar_generator import CalendarGenerator
from leaderboard import Leaderboard
from prize_manager import PrizeManager

app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev-secret-key-change-in-production'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///' + os.path.join(app.root_path, 'checkin.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)


def init_db():
    with app.app_context():
        db.create_all()
        if not User.query.filter_by(username='admin').first():
            admin = User(username='admin', password='admin123', is_admin=True)
            db.session.add(admin)
        if not User.query.filter_by(username='user1').first():
            user1 = User(username='user1', password='123456')
            db.session.add(user1)
        if not User.query.filter_by(username='user2').first():
            user2 = User(username='user2', password='123456')
            db.session.add(user2)
        db.session.commit()
        if not PrizeManager.get_all_prizes():
            PrizeManager.create_prize('积分双倍卡', '使用后下次签到积分翻倍', 50, 100)
            PrizeManager.create_prize('精美徽章', '虚拟荣誉徽章', 100, 50)
            PrizeManager.create_prize('补签卡', '可免费补签一次', 150, 30)
            PrizeManager.create_prize('VIP称号', '30天VIP专属称号', 300, 20)
            PrizeManager.create_prize('限量头像框', '专属限量头像框', 500, 10)


def login_required(f):
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return wrapper


def admin_required(f):
    from functools import wraps
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return redirect(url_for('login'))
        user = User.query.get(session['user_id'])
        if not user or not user.is_admin:
            flash('需要管理员权限', 'error')
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    return wrapper


@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        user = User.query.filter_by(username=username, password=password).first()
        if user:
            session['user_id'] = user.id
            session['username'] = user.username
            session['is_admin'] = user.is_admin
            flash('登录成功', 'success')
            return redirect(url_for('dashboard'))
        flash('用户名或密码错误', 'error')
    return render_template('login.html')


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


@app.route('/dashboard')
@login_required
def dashboard():
    user_id = session['user_id']
    user = User.query.get(user_id)
    has_checked = CheckinSystem.has_checked_today(user_id)
    streak = CheckinSystem.get_streak(user_id)
    rank = Leaderboard.get_user_rank(user_id)
    calendar_data = CalendarGenerator.generate_month_calendar(user_id)
    point_history = PointsSystem.get_history(user_id, 10)

    return render_template('dashboard.html',
                           user=user,
                           has_checked=has_checked,
                           streak=streak,
                           rank=rank,
                           calendar=calendar_data,
                           point_history=point_history,
                           makeup_cost=CheckinSystem.MAKEUP_COST)


@app.route('/checkin', methods=['POST'])
@login_required
def checkin():
    user_id = session['user_id']
    result, err = CheckinSystem.do_checkin(user_id)
    if err:
        return jsonify({'success': False, 'message': err})
    return jsonify({'success': True, 'data': result})


@app.route('/makeup', methods=['POST'])
@login_required
def makeup():
    user_id = session['user_id']
    date_str = request.form.get('date')
    try:
        check_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'success': False, 'message': '日期格式错误'})
    result, err = CheckinSystem.makeup_checkin(user_id, check_date)
    if err:
        return jsonify({'success': False, 'message': err})
    return jsonify({'success': True, 'data': result})


@app.route('/calendar')
@login_required
def calendar_view():
    user_id = session['user_id']
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    calendar_data = CalendarGenerator.generate_month_calendar(user_id, year, month)
    user = User.query.get(user_id)
    return render_template('calendar.html',
                           calendar=calendar_data,
                           user=user,
                           makeup_cost=CheckinSystem.MAKEUP_COST)


@app.route('/leaderboard')
@login_required
def leaderboard_view():
    user_id = session['user_id']
    points_board = Leaderboard.get_points_leaderboard(20)
    streak_board = Leaderboard.get_streak_leaderboard(20)
    user_rank = Leaderboard.get_user_rank(user_id)
    user = User.query.get(user_id)
    return render_template('leaderboard.html',
                           points_board=points_board,
                           streak_board=streak_board,
                           user_rank=user_rank,
                           user=user)


@app.route('/prizes')
@login_required
def prizes_view():
    user_id = session['user_id']
    user = User.query.get(user_id)
    prizes = PrizeManager.get_all_prizes()
    user_exchanges = PrizeManager.get_user_exchanges(user_id, 10)
    return render_template('prizes.html',
                           prizes=prizes,
                           user=user,
                           user_exchanges=user_exchanges)


@app.route('/exchange/<int:prize_id>', methods=['POST'])
@login_required
def exchange(prize_id):
    user_id = session['user_id']
    result, err = PrizeManager.exchange_prize(user_id, prize_id)
    if err:
        return jsonify({'success': False, 'message': err})
    return jsonify({'success': True, 'data': result})


@app.route('/admin')
@admin_required
def admin_dashboard():
    user = User.query.get(session['user_id'])
    prizes = PrizeManager.get_all_prizes(include_inactive=True)
    users = User.query.all()
    return render_template('admin.html', user=user, prizes=prizes, users=users)


@app.route('/admin/prize/add', methods=['POST'])
@admin_required
def add_prize():
    name = request.form.get('name')
    description = request.form.get('description', '')
    points_required = request.form.get('points_required', type=int)
    stock = request.form.get('stock', type=int, default=999)
    if not name or points_required is None:
        flash('奖品名称和所需积分为必填', 'error')
        return redirect(url_for('admin_dashboard'))
    PrizeManager.create_prize(name, description, points_required, stock)
    flash('奖品添加成功', 'success')
    return redirect(url_for('admin_dashboard'))


@app.route('/admin/prize/edit/<int:prize_id>', methods=['POST'])
@admin_required
def edit_prize(prize_id):
    name = request.form.get('name')
    description = request.form.get('description')
    points_required = request.form.get('points_required', type=int)
    stock = request.form.get('stock', type=int)
    is_active = request.form.get('is_active') == 'on'
    PrizeManager.update_prize(prize_id, name, description, points_required, stock, is_active)
    flash('奖品更新成功', 'success')
    return redirect(url_for('admin_dashboard'))


@app.route('/admin/prize/delete/<int:prize_id>', methods=['POST'])
@admin_required
def delete_prize(prize_id):
    PrizeManager.delete_prize(prize_id)
    flash('奖品删除成功', 'success')
    return redirect(url_for('admin_dashboard'))


@app.route('/points/history')
@login_required
def points_history():
    user_id = session['user_id']
    user = User.query.get(user_id)
    history = PointsSystem.get_history(user_id, 50)
    return render_template('points_history.html', user=user, history=history)


if __name__ == '__main__':
    init_db()
    app.run(debug=True, host='0.0.0.0', port=5000)
