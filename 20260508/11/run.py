import os
import sys

if __name__ == '__main__':
    print(f"Python path: {sys.executable}")
    print(f"Python version: {sys.version}")
    
    try:
        import numpy
        print(f"✓ numpy installed")
    except ImportError:
        print("✗ numpy not installed")
        print("Installing dependencies...")
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "flask", "numpy"])
    
    try:
        import flask
        print(f"✓ flask installed")
    except ImportError:
        print("✗ flask not installed")
        import subprocess
        subprocess.run([sys.executable, "-m", "pip", "install", "flask", "numpy"])
    
    from app import app
    app.run(debug=True, port=5000)
