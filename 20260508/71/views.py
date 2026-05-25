import markdown
from flask import Blueprint, render_template, request, redirect, url_for, session, flash, jsonify, send_file
from functools import wraps
from models import db, Message, Like, get_message_tree, get_replies
from captcha import generate_captcha_text, generate_captcha_image
from config import Config

views_bp = Blueprint('views', __name__)


def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('is_admin'):
            return redirect(url_for('views.admin_login'))
        return f(*args, **kwargs)
    return decorated_function


def get_client_ip():
    return request.headers.get('X-Forwarded-For', request.remote_addr)


def render_markdown(text):
    return markdown.markdown(text, extensions=['extra', 'codehilite'])


def build_comment_tree(parent_id, user_ip):
    replies = get_replies(parent_id)
    result = []
    for reply in replies:
        reply_data = {
            'id': reply.id,
            'content': reply.content,
            'content_html': render_markdown(reply.content),
            'nickname': reply.nickname,
            'created_at': reply.created_at,
            'like_count': reply.like_count(),
            'user_liked': reply.has_liked(user_ip),
            'replies': build_comment_tree(reply.id, user_ip)
        }
        result.append(reply_data)
    return result


@views_bp.route('/')
def index():
    raw_messages = get_message_tree()
    user_ip = get_client_ip()
    messages = []
    for msg in raw_messages:
        msg_data = {
            'id': msg.id,
            'content': msg.content,
            'content_html': render_markdown(msg.content),
            'nickname': msg.nickname,
            'created_at': msg.created_at,
            'is_pinned': msg.is_pinned,
            'like_count': msg.like_count(),
            'user_liked': msg.has_liked(user_ip),
            'replies': build_comment_tree(msg.id, user_ip)
        }
        messages.append(msg_data)

    return render_template('index.html', messages=messages)


@views_bp.route('/captcha')
def captcha():
    text = generate_captcha_text(Config.CAPTCHA_LENGTH)
    session['captcha'] = text.lower()
    img_buf = generate_captcha_image(text)
    return send_file(img_buf, mimetype='image/png')


@views_bp.route('/post', methods=['POST'])
def post_message():
    content = request.form.get('content', '').strip()
    nickname = request.form.get('nickname', '').strip() or '匿名用户'
    captcha_input = request.form.get('captcha', '').strip().lower()
    parent_id = request.form.get('parent_id', type=int)

    if not content:
        flash('留言内容不能为空', 'error')
        return redirect(url_for('views.index'))

    if captcha_input != session.get('captcha'):
        flash('验证码错误', 'error')
        return redirect(url_for('views.index'))

    session.pop('captcha', None)

    if parent_id:
        parent = Message.query.get(parent_id)
        if not parent or parent.is_deleted:
            flash('回复的留言不存在', 'error')
            return redirect(url_for('views.index'))

    message = Message(content=content, nickname=nickname, parent_id=parent_id)
    db.session.add(message)
    db.session.commit()

    flash('留言发布成功', 'success')
    return redirect(url_for('views.index'))


@views_bp.route('/like/<int:message_id>', methods=['POST'])
def like_message(message_id):
    message = Message.query.get_or_404(message_id)
    if message.is_deleted:
        return jsonify({'success': False, 'error': '留言不存在'}), 404

    user_ip = get_client_ip()

    if message.has_liked(user_ip):
        like = Like.query.filter_by(message_id=message_id, ip=user_ip).first()
        db.session.delete(like)
        liked = False
    else:
        like = Like(message_id=message_id, ip=user_ip)
        db.session.add(like)
        liked = True

    db.session.commit()

    return jsonify({
        'success': True,
        'liked': liked,
        'count': message.like_count()
    })


@views_bp.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if request.method == 'POST':
        password = request.form.get('password', '')
        if password == Config.ADMIN_PASSWORD:
            session['is_admin'] = True
            flash('管理员登录成功', 'success')
            return redirect(url_for('views.admin'))
        else:
            flash('密码错误', 'error')

    return render_template('admin_login.html')


@views_bp.route('/admin/logout')
def admin_logout():
    session.pop('is_admin', None)
    return redirect(url_for('views.index'))


@views_bp.route('/admin')
@admin_required
def admin():
    messages = Message.query.filter_by(is_deleted=False).order_by(
        Message.is_pinned.desc(),
        Message.created_at.desc()
    ).all()
    return render_template('admin.html', messages=messages)


@views_bp.route('/admin/pin/<int:message_id>', methods=['POST'])
@admin_required
def pin_message(message_id):
    message = Message.query.get_or_404(message_id)
    message.is_pinned = not message.is_pinned
    db.session.commit()
    return redirect(url_for('views.admin'))


@views_bp.route('/admin/delete/<int:message_id>', methods=['POST'])
@admin_required
def delete_message(message_id):
    message = Message.query.get_or_404(message_id)
    message.is_deleted = True
    db.session.commit()
    flash('留言已删除', 'success')
    return redirect(url_for('views.admin'))
