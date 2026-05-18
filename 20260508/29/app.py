import atexit
from flask import Flask
from config import Config
from models import db
from routes import main_bp, admin_bp
from scheduler import init_scheduler, shutdown_scheduler


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)

    app.register_blueprint(main_bp, url_prefix='/')
    app.register_blueprint(admin_bp, url_prefix='/admin')

    with app.app_context():
        db.create_all()

    scheduler = init_scheduler(app)

    atexit.register(shutdown_scheduler)

    return app


app = create_app()


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
