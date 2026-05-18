from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, TextAreaField
from wtforms.validators import DataRequired, Email, EqualTo, Length, ValidationError
from models import User


class LoginForm(FlaskForm):
    username = StringField('用户名', validators=[DataRequired()])
    password = PasswordField('密码', validators=[DataRequired()])
    submit = SubmitField('登录')


class RegistrationForm(FlaskForm):
    username = StringField('用户名', validators=[DataRequired(), Length(min=3, max=64)])
    email = StringField('邮箱', validators=[DataRequired(), Email(), Length(max=120)])
    password = PasswordField('密码', validators=[DataRequired(), Length(min=6)])
    password2 = PasswordField('确认密码', validators=[DataRequired(), EqualTo('password')])
    submit = SubmitField('注册')

    def validate_username(self, username):
        user = User.query.filter_by(username=username.data).first()
        if user is not None:
            raise ValidationError('该用户名已被使用。')

    def validate_email(self, email):
        user = User.query.filter_by(email=email.data).first()
        if user is not None:
            raise ValidationError('该邮箱已被注册。')


class PostForm(FlaskForm):
    title = StringField('标题', validators=[DataRequired(), Length(max=140)])
    body = TextAreaField('正文', validators=[DataRequired()])
    tags = StringField('标签（用逗号分隔）')
    submit = SubmitField('发布')


class CommentForm(FlaskForm):
    guest_name = StringField('昵称', validators=[DataRequired(), Length(max=64)])
    body = TextAreaField('评论', validators=[DataRequired(), Length(max=500)])
    submit = SubmitField('发表评论')
