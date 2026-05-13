from flask import Flask, render_template
from flask_cors import CORS
from app.auth.routes import auth_bp
from app.articles.routes import articles_bp

app = Flask(__name__)
app.config['SECRET_KEY'] = 'default-secret-key'
CORS(app)

app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(articles_bp, url_prefix='/articles')

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)