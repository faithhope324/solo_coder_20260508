import os
import uuid
import string
import random
import threading
import time
import json
from datetime import datetime, timedelta
from flask import Flask, render_template, request, redirect, url_for, send_file, jsonify, flash

app = Flask(__name__)
app.config['SECRET_KEY'] = 'temp-file-share-secret-key-2024'
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['METADATA_FILE'] = 'metadata.json'

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

EXPIRE_OPTIONS = {
    '1h': timedelta(hours=1),
    '24h': timedelta(hours=24),
    '7d': timedelta(days=7)
}

metadata_lock = threading.Lock()

def load_metadata():
    if os.path.exists(app.config['METADATA_FILE']):
        with open(app.config['METADATA_FILE'], 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}

def save_metadata(meta):
    with metadata_lock:
        with open(app.config['METADATA_FILE'], 'w', encoding='utf-8') as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

def generate_code(length=6):
    chars = string.ascii_uppercase + string.digits
    return ''.join(random.choice(chars) for _ in range(length))

def generate_token():
    return uuid.uuid4().hex

def cleanup_expired_files():
    while True:
        try:
            metadata = load_metadata()
            now = datetime.now().isoformat()
            expired = []
            
            for token, info in metadata.items():
                if info['expire_time'] < now:
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], info['stored_name'])
                    if os.path.exists(file_path):
                        os.remove(file_path)
                    expired.append(token)
            
            if expired:
                for token in expired:
                    del metadata[token]
                save_metadata(metadata)
                print(f"Cleaned up {len(expired)} expired files at {datetime.now()}")
        except Exception as e:
            print(f"Cleanup error: {e}")
        
        time.sleep(300)

cleanup_thread = threading.Thread(target=cleanup_expired_files, daemon=True)
cleanup_thread.start()

@app.route('/')
def index():
    return render_template('index.html', expire_options=list(EXPIRE_OPTIONS.keys()))

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        flash('请选择文件', 'error')
        return redirect(url_for('index'))
    
    file = request.files['file']
    if file.filename == '':
        flash('请选择文件', 'error')
        return redirect(url_for('index'))
    
    expire_option = request.form.get('expire', '24h')
    if expire_option not in EXPIRE_OPTIONS:
        flash('无效的过期时间', 'error')
        return redirect(url_for('index'))
    
    if file:
        original_name = file.filename
        token = generate_token()
        code = generate_code()
        
        stored_name = f"{token}_{os.path.basename(original_name)}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], stored_name)
        file.save(file_path)
        
        expire_time = datetime.now() + EXPIRE_OPTIONS[expire_option]
        file_size = os.path.getsize(file_path)
        
        metadata = load_metadata()
        metadata[token] = {
            'original_name': original_name,
            'stored_name': stored_name,
            'code': code,
            'upload_time': datetime.now().isoformat(),
            'expire_time': expire_time.isoformat(),
            'expire_option': expire_option,
            'size': file_size,
            'downloads': 0
        }
        save_metadata(metadata)
        
        download_url = url_for('download_page', token=token, _external=True)
        
        return render_template('upload_success.html',
                            download_url=download_url,
                            code=code,
                            original_name=original_name,
                            expire_option=expire_option,
                            token=token)
    
    flash('上传失败', 'error')
    return redirect(url_for('index'))

@app.route('/d/<token>', methods=['GET', 'POST'])
def download_page(token):
    metadata = load_metadata()
    
    if token not in metadata:
        return render_template('error.html', message='文件不存在或已过期'), 404
    
    info = metadata[token]
    
    if datetime.now().isoformat() > info['expire_time']:
        del metadata[token]
        save_metadata(metadata)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], info['stored_name'])
        if os.path.exists(file_path):
            os.remove(file_path)
        return render_template('error.html', message='文件已过期'), 410
    
    if request.method == 'POST':
        input_code = request.form.get('code', '').strip().upper()
        
        if input_code == info['code']:
            info['downloads'] += 1
            save_metadata(metadata)
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], info['stored_name'])
            return send_file(file_path, as_attachment=True, download_name=info['original_name'])
        else:
            flash('提取码错误，请重试', 'error')
    
    return render_template('download.html',
                        token=token,
                        original_name=info['original_name'],
                        size=info['size'],
                        expire_time=info['expire_time'],
                        upload_time=info['upload_time'])

@app.route('/admin')
def admin():
    metadata = load_metadata()
    now = datetime.now().isoformat()
    
    files = []
    for token, info in metadata.items():
        status = 'active' if info['expire_time'] >= now else 'expired'
        files.append({
            'token': token,
            'code': info['code'],
            'original_name': info['original_name'],
            'upload_time': info['upload_time'],
            'expire_time': info['expire_time'],
            'expire_option': info['expire_option'],
            'size': info['size'],
            'downloads': info['downloads'],
            'status': status
        })
    
    files.sort(key=lambda x: x['upload_time'], reverse=True)
    
    return render_template('admin.html', files=files, total=len(files))

@app.route('/admin/delete/<token>', methods=['POST'])
def delete_file(token):
    metadata = load_metadata()
    
    if token in metadata:
        info = metadata[token]
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], info['stored_name'])
        if os.path.exists(file_path):
            os.remove(file_path)
        del metadata[token]
        save_metadata(metadata)
        flash('文件已删除', 'success')
    else:
        flash('文件不存在', 'error')
    
    return redirect(url_for('admin'))

@app.route('/api/stats')
def api_stats():
    metadata = load_metadata()
    now = datetime.now().isoformat()
    
    stats = {
        'total': len(metadata),
        'active': 0,
        'expired': 0,
        'total_size': 0
    }
    
    for info in metadata.values():
        stats['total_size'] += info['size']
        if info['expire_time'] >= now:
            stats['active'] += 1
        else:
            stats['expired'] += 1
    
    return jsonify(stats)

@app.errorhandler(413)
def request_entity_too_large(error):
    flash('文件大小超过10MB限制', 'error')
    return redirect(url_for('index'))

def format_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{size_bytes / 1024:.2f} KB"
    else:
        return f"{size_bytes / (1024 * 1024):.2f} MB"

app.jinja_env.filters['format_size'] = format_size

def format_datetime(iso_str):
    dt = datetime.fromisoformat(iso_str)
    return dt.strftime('%Y-%m-%d %H:%M:%S')

app.jinja_env.filters['format_datetime'] = format_datetime

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
