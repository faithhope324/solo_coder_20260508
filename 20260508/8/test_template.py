from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    print('Template folder:', app.template_folder)
    import os
    print('Current directory:', os.getcwd())
    print('Templates directory exists:', os.path.exists('templates'))
    print('Index.html exists:', os.path.exists('templates/index.html'))
    app.run(debug=True, host='0.0.0.0', port=5000)
