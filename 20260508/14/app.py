import os
import json
import numpy as np
from flask import Flask, render_template, request, jsonify
import pyvista as pv

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = 'uploads'

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

def load_point_cloud(filepath):
    if filepath.endswith('.ply'):
        mesh = pv.read(filepath)
    elif filepath.endswith('.xyz'):
        try:
            data = np.loadtxt(filepath, delimiter=None, comments='#')
            if data.shape[1] >= 3:
                mesh = pv.PolyData(data[:, :3])
            else:
                raise ValueError("XYZ文件需要至少3列坐标数据")
        except Exception as e:
            raise ValueError(f"无法解析XYZ文件: {e}")
    else:
        raise ValueError("不支持的文件格式。请上传PLY或XYZ文件")
    
    return mesh

def process_point_cloud(mesh):
    points = np.array(mesh.points)
    
    if len(points) > 100000:
        indices = np.random.choice(len(points), 100000, replace=False)
        points = points[indices]
    
    min_coords = points.min(axis=0)
    max_coords = points.max(axis=0)
    center = (min_coords + max_coords) / 2
    
    points_centered = points - center
    
    max_distance = np.abs(points_centered).max()
    if max_distance > 0:
        points_normalized = points_centered / max_distance
    else:
        points_normalized = points_centered
    
    min_z = points[:, 2].min()
    max_z = points[:, 2].max()
    if max_z > min_z:
        z_normalized = (points[:, 2] - min_z) / (max_z - min_z)
    else:
        z_normalized = np.zeros(len(points))
    
    colors_height = np.zeros((len(points), 3), dtype=np.uint8)
    for i, z in enumerate(z_normalized):
        if z < 0.5:
            t = z * 2
            colors_height[i] = [int(0 + 255*t), int(255 - 255*t), int(255)]
        else:
            t = (z - 0.5) * 2
            colors_height[i] = [int(255), int(255*t), int(255 - 255*t)]
    
    np.random.seed(42)
    colors_random = np.random.randint(0, 256, (len(points), 3), dtype=np.uint8)
    
    return {
        'points': points_normalized.tolist(),
        'colors_height': colors_height.tolist(),
        'colors_random': colors_random.tolist(),
        'original_min': min_coords.tolist(),
        'original_max': max_coords.tolist(),
        'center': center.tolist(),
        'count': len(points)
    }

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': '没有上传文件'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '没有选择文件'}), 400
    
    if not (file.filename.endswith('.ply') or file.filename.endswith('.xyz')):
        return jsonify({'error': '不支持的文件格式。请上传PLY或XYZ文件'}), 400
    
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
    file.save(filepath)
    
    try:
        mesh = load_point_cloud(filepath)
        processed = process_point_cloud(mesh)
        
        return jsonify({
            'success': True,
            'data': processed
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if os.path.exists(filepath):
            os.remove(filepath)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
