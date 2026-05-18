from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from config import Config
import re

db = SQLAlchemy()
login_manager = LoginManager()
login_manager.login_view = 'auth.login'
login_manager.login_message = '请先登录。'
login_manager.login_message_category = 'warning'


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    login_manager.init_app(app)

    from routes.auth import bp as auth_bp
    from routes.posts import bp as posts_bp
    from routes.comments import bp as comments_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(posts_bp)
    app.register_blueprint(comments_bp)

    @app.template_filter('nl2br')
    def nl2br_filter(s):
        return re.sub(r'\n', '<br>\n', s)

    with app.app_context():
        from models import User, Post, Comment, Tag
        db.create_all()

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000, use_reloader=False)
