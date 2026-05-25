from flask import Flask
from config import Config
from models import db, init_db
from views import views_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    app.register_blueprint(views_bp)

    with app.app_context():
        init_db()

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=5001)
