from app import app
import sys

if __name__ == '__main__':
    print('Starting server on http://127.0.0.1:5000', flush=True)
    print('Press CTRL+C to quit', flush=True)
    sys.stdout.flush()
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False, threaded=True)
