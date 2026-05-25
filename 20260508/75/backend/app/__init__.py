from flask import Flask
from flask_cors import CORS
import os

def create_app():
    app = Flask(__name__, static_folder=None)
    
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024
    app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads')
    
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    from app.routes import api_bp
    app.register_blueprint(api_bp, url_prefix='/api')
    
    @app.route('/')
    def index():
        return {
            'name': 'Text Summarizer API',
            'version': '1.0.0',
            'endpoints': {
                'POST /api/upload': 'Upload and parse PDF file',
                'POST /api/summarize': 'Generate text summary',
                'POST /api/keywords': 'Extract keywords',
                'POST /api/analyze': 'Full analysis pipeline'
            }
        }
    
    return app
