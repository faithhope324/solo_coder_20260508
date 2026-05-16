import os
import numpy as np
from flask import Flask, render_template, request, jsonify
from tensorflow.keras.models import load_model
from PIL import Image
import io
import base64

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

MODELS_DIR = 'models'
UPLOAD_FOLDER = 'static/uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

encoder = None
encoded_data = None
labels_data = None
test_images = None

def load_pretrained_data():
    global encoder, encoded_data, labels_data, test_images
    
    print("Loading models and data...")
    
    encoder_path = os.path.join(MODELS_DIR, 'encoder.keras')
    encoded_path = os.path.join(MODELS_DIR, 'encoded_test.npy')
    labels_path = os.path.join(MODELS_DIR, 'labels_test.npy')
    images_path = os.path.join(MODELS_DIR, 'test_images.npy')
    
    if not all(os.path.exists(p) for p in [encoder_path, encoded_path, labels_path, images_path]):
        raise FileNotFoundError(
            "Model files not found. Please run 'python train_ae.py' first."
        )
    
    encoder = load_model(encoder_path, compile=False)
    encoded_data = np.load(encoded_path)
    labels_data = np.load(labels_path)
    test_images = np.load(images_path)
    
    print(f"Loaded {len(encoded_data)} test samples with {encoded_data.shape[1]}D encoding")

def preprocess_image(image_data):
    img = Image.open(io.BytesIO(image_data)).convert('L')
    
    img = img.resize((28, 28), Image.Resampling.LANCZOS)
    
    img_array = np.array(img, dtype=np.float32) / 255.0
    
    original_mean = np.mean(img_array)
    
    if original_mean > 0.5:
        img_array = 1.0 - img_array
    
    warnings = []
    if np.mean(img_array) < 0.01:
        warnings.append('图片内容过少，可能是全黑或无效图片')
    
    img_array = np.expand_dims(img_array, axis=(0, -1))
    
    return img_array, warnings

def encode_image(processed_img):
    encoding = encoder.predict(processed_img, verbose=0)
    return encoding[0]

def find_similar_images(new_encoding, top_k=8):
    distances = np.linalg.norm(encoded_data - new_encoding, axis=1)
    top_indices = np.argsort(distances)[:top_k]
    
    similar_images = []
    for idx in top_indices:
        img_data = test_images[idx][:, :, 0].tolist()
        similar_images.append({
            'index': int(idx),
            'label': int(labels_data[idx]),
            'distance': float(distances[idx]),
            'x': float(encoded_data[idx, 0]),
            'y': float(encoded_data[idx, 1]),
            'image': img_data
        })
    
    return similar_images

def get_plot_data():
    colors = [
        '#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd',
        '#8c564b', '#e377c2', '#7f7f7f', '#bcbd22', '#17becf'
    ]
    
    traces = []
    for digit in range(10):
        mask = labels_data == digit
        if np.any(mask):
            traces.append({
                'name': str(digit),
                'x': encoded_data[mask, 0].tolist(),
                'y': encoded_data[mask, 1].tolist(),
                'marker': {'color': colors[digit], 'size': 3, 'opacity': 0.7},
                'mode': 'markers',
                'type': 'scatter'
            })
    
    return traces

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/plot-data', methods=['GET'])
def api_plot_data():
    try:
        traces = get_plot_data()
        return jsonify({'traces': traces})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/upload', methods=['POST'])
def api_upload():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if 'Content-Length' in request.headers:
            content_length = int(request.headers.get('Content-Length', 0))
            if content_length > 10 * 1024 * 1024:
                return jsonify({'error': '图片过大，请上传小于10MB的图片'}), 400
        
        image_data = file.read()
        
        if len(image_data) > 10 * 1024 * 1024:
            return jsonify({'error': '图片过大，请上传小于10MB的图片'}), 400
        
        processed_img, warnings = preprocess_image(image_data)
        
        encoding = encode_image(processed_img)
        similar_images = find_similar_images(encoding)
        
        buffered = io.BytesIO()
        pil_img = Image.open(io.BytesIO(image_data)).convert('RGB')
        pil_img.save(buffered, format='PNG')
        uploaded_img_b64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        processed_buffered = io.BytesIO()
        processed_pil = Image.fromarray((processed_img[0, :, :, 0] * 255).astype(np.uint8))
        processed_pil.save(processed_buffered, format='PNG')
        processed_b64 = base64.b64encode(processed_buffered.getvalue()).decode('utf-8')
        
        return jsonify({
            'success': True,
            'encoding': encoding.tolist(),
            'uploaded_image': uploaded_img_b64,
            'processed_image': processed_b64,
            'similar_images': similar_images,
            'warnings': warnings
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    load_pretrained_data()
    app.run(debug=True, host='0.0.0.0', port=5000)
