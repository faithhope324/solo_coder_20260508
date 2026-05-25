from datetime import datetime, timedelta, timezone
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import func

db = SQLAlchemy()

BEIJING_TZ = timezone(timedelta(hours=8))


def beijing_now():
    return datetime.now(BEIJING_TZ).replace(tzinfo=None)


class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    nickname = db.Column(db.String(50), default='匿名用户')
    created_at = db.Column(db.DateTime, default=beijing_now)
    is_pinned = db.Column(db.Boolean, default=False)
    is_deleted = db.Column(db.Boolean, default=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=True)

    replies = db.relationship('Message', backref=db.backref('parent', remote_side=[id]), lazy='dynamic')
    likes = db.relationship('Like', backref='message', lazy='dynamic', cascade='all, delete-orphan')

    def like_count(self):
        return self.likes.count()

    def has_liked(self, ip):
        return Like.query.filter_by(message_id=self.id, ip=ip).first() is not None

    def to_dict(self):
        return {
            'id': self.id,
            'content': self.content,
            'nickname': self.nickname,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            'is_pinned': self.is_pinned,
            'parent_id': self.parent_id,
            'like_count': self.like_count()
        }


class Like(db.Model):
    __tablename__ = 'likes'

    id = db.Column(db.Integer, primary_key=True)
    message_id = db.Column(db.Integer, db.ForeignKey('messages.id'), nullable=False)
    ip = db.Column(db.String(45), nullable=False)
    created_at = db.Column(db.DateTime, default=beijing_now)

    __table_args__ = (db.UniqueConstraint('message_id', 'ip', name='_message_ip_uc'),)


def get_message_tree():
    messages = Message.query.filter_by(is_deleted=False, parent_id=None).order_by(
        Message.is_pinned.desc(),
        Message.created_at.desc()
    ).all()
    return messages


def get_replies(parent_id):
    return Message.query.filter_by(is_deleted=False, parent_id=parent_id).order_by(
        Message.created_at.asc()
    ).all()


def init_db():
    db.create_all()
