class BackgroundRemover {
    constructor() {
        this.selfieSegmentation = null;
        this.isModelLoaded = false;
        this.originalImage = null;
        this.backgroundImage = null;
        this.segmentationMask = null;
        this.currentView = 'result';
        this.settings = {
            bgType: 'color',
            bgColor: '#ffffff',
            gradient: {
                angle: 180,
                start: '#667eea',
                end: '#764ba2'
            },
            bgFitMode: 'cover',
            smoothness: 5,
            threshold: 50,
            brightness: 100,
            contrast: 100,
            downloadFormat: 'png',
            downloadQuality: 0.9
        };

        this.init();
    }

    init() {
        this.bindEvents();
        this.loadModel();
    }

    bindEvents() {
        const uploadBox = document.getElementById('uploadBox');
        const imageInput = document.getElementById('imageInput');

        uploadBox.addEventListener('click', () => imageInput.click());
        uploadBox.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadBox.classList.add('drag-over');
        });
        uploadBox.addEventListener('dragleave', () => {
            uploadBox.classList.remove('drag-over');
        });
        uploadBox.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadBox.classList.remove('drag-over');
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('image/')) {
                this.loadImage(file);
            }
        });
        imageInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadImage(e.target.files[0]);
            }
        });

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        document.getElementById('bgColorPicker').addEventListener('input', (e) => {
            this.settings.bgColor = e.target.value;
            this.processImage();
        });

        document.querySelectorAll('.color-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.settings.bgColor = e.target.dataset.color;
                document.getElementById('bgColorPicker').value = e.target.dataset.color;
                this.processImage();
            });
        });

        document.getElementById('gradientAngle').addEventListener('input', (e) => {
            this.settings.gradient.angle = parseInt(e.target.value);
            document.getElementById('angleValue').textContent = e.target.value + '°';
            this.processImage();
        });

        document.getElementById('gradientStart').addEventListener('input', (e) => {
            this.settings.gradient.start = e.target.value;
            this.processImage();
        });

        document.getElementById('gradientEnd').addEventListener('input', (e) => {
            this.settings.gradient.end = e.target.value;
            this.processImage();
        });

        document.querySelectorAll('.gradient-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const gradient = e.target.dataset.gradient;
                const matches = gradient.match(/#([0-9a-fA-F]{6})/g);
                if (matches && matches.length >= 2) {
                    this.settings.gradient.start = matches[0];
                    this.settings.gradient.end = matches[1];
                    document.getElementById('gradientStart').value = matches[0];
                    document.getElementById('gradientEnd').value = matches[1];
                    this.processImage();
                }
            });
        });

        const bgImageInput = document.getElementById('bgImageInput');
        document.getElementById('uploadBgBtn').addEventListener('click', () => bgImageInput.click());
        bgImageInput.addEventListener('change', (e) => {
            if (e.target.files[0]) {
                this.loadBackgroundImage(e.target.files[0]);
            }
        });

        document.getElementById('removeBgBtn').addEventListener('click', () => {
            this.backgroundImage = null;
            document.getElementById('bgPreview').style.display = 'none';
            this.processImage();
        });

        document.getElementById('bgFitMode').addEventListener('change', (e) => {
            this.settings.bgFitMode = e.target.value;
            this.processImage();
        });

        document.getElementById('smoothness').addEventListener('input', (e) => {
            this.settings.smoothness = parseInt(e.target.value);
            document.getElementById('smoothnessValue').textContent = e.target.value;
            this.processImage();
        });

        document.getElementById('threshold').addEventListener('input', (e) => {
            this.settings.threshold = parseInt(e.target.value);
            document.getElementById('thresholdValue').textContent = e.target.value + '%';
            this.processImage();
        });

        document.getElementById('brightness').addEventListener('input', (e) => {
            this.settings.brightness = parseInt(e.target.value);
            document.getElementById('brightnessValue').textContent = e.target.value + '%';
            this.processImage();
        });

        document.getElementById('contrast').addEventListener('input', (e) => {
            this.settings.contrast = parseInt(e.target.value);
            document.getElementById('contrastValue').textContent = e.target.value + '%';
            this.processImage();
        });

        document.getElementById('downloadFormat').addEventListener('change', (e) => {
            this.settings.downloadFormat = e.target.value;
        });

        document.getElementById('downloadQuality').addEventListener('input', (e) => {
            this.settings.downloadQuality = parseInt(e.target.value) / 100;
            document.getElementById('qualityValue').textContent = e.target.value + '%';
        });

        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadImage());

        document.getElementById('resetBtn').addEventListener('click', () => this.reset());

        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });
    }

    async loadModel() {
        this.updateProgress(10, '初始化模型...');

        try {
            this.selfieSegmentation = new SelfieSegmentation({
                locateFile: (file) => {
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
                }
            });

            this.updateProgress(30, '加载模型文件...');

            this.selfieSegmentation.setOptions({
                modelSelection: 1,
            });

            this.selfieSegmentation.onResults((results) => this.onSegmentationResults(results));

            this.updateProgress(60, '预热模型...');

            const warmupCanvas = document.createElement('canvas');
            warmupCanvas.width = 256;
            warmupCanvas.height = 256;
            const warmupCtx = warmupCanvas.getContext('2d');
            warmupCtx.fillStyle = '#ffffff';
            warmupCtx.fillRect(0, 0, 256, 256);
            
            await this.selfieSegmentation.send({ image: warmupCanvas });

            this.updateProgress(100, '模型加载完成！');
            this.isModelLoaded = true;

            setTimeout(() => {
                document.getElementById('modelLoading').classList.add('hidden');
            }, 500);

        } catch (error) {
            console.error('模型加载失败:', error);
            this.updateProgress(0, '模型加载失败，请刷新页面重试');
        }
    }

    updateProgress(percent, text) {
        document.getElementById('progressFill').style.width = percent + '%';
        document.getElementById('progressText').textContent = text;
    }

    loadImage(file) {
        this.showStatus('正在加载并压缩图片...', true);
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const compressedImg = this.compressImage(img);
                this.originalImage = compressedImg;
                this.showControls();
                this.showStatus('图片加载完成，正在处理...', true);
                this.processImage();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    compressImage(img, maxSize = 1920) {
        let width = img.width;
        let height = img.height;

        if (width <= maxSize && height <= maxSize) {
            return img;
        }

        if (width > height) {
            if (width > maxSize) {
                height = Math.round(height * (maxSize / width));
                width = maxSize;
            }
        } else {
            if (height > maxSize) {
                width = Math.round(width * (maxSize / height));
                height = maxSize;
            }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedImg = new Image();
        compressedImg.src = canvas.toDataURL('image/jpeg', 0.92);
        return compressedImg;
    }

    loadBackgroundImage(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                this.backgroundImage = this.compressImage(img, 1920);
                document.getElementById('bgPreviewImg').src = e.target.result;
                document.getElementById('bgPreview').style.display = 'block';
                this.processImage();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    showControls() {
        document.getElementById('controlsSection').style.display = 'block';
        document.getElementById('previewSection').style.display = 'block';
        document.querySelector('.upload-section').style.display = 'none';
    }

    switchTab(tab) {
        this.settings.bgType = tab;

        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tab + 'Tab');
        });

        this.processImage();
    }

    switchView(view) {
        this.currentView = view;

        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        const previewCanvas = document.getElementById('previewCanvas');
        const sideBySide = document.getElementById('sideBySideContainer');

        if (view === 'sidebyside') {
            previewCanvas.style.display = 'none';
            sideBySide.style.display = 'grid';
            this.renderSideBySide();
        } else {
            previewCanvas.style.display = 'block';
            sideBySide.style.display = 'none';
            this.renderPreview();
        }
    }

    async processImage() {
        if (!this.originalImage || !this.isModelLoaded) return;

        this.showStatus('正在处理图片...', true);

        try {
            await this.selfieSegmentation.send({ image: this.originalImage });
        } catch (error) {
            console.error('处理图片失败:', error);
            this.showStatus('处理失败，请重试');
        }
    }

    onSegmentationResults(results) {
        this.segmentationMask = results.segmentationMask;
        this.renderPreview();
        this.showStatus('处理完成');
    }

    renderPreview() {
        if (!this.originalImage || !this.segmentationMask) return;

        const canvas = document.getElementById('previewCanvas');
        const ctx = canvas.getContext('2d');

        canvas.width = this.originalImage.width;
        canvas.height = this.originalImage.height;

        switch (this.currentView) {
            case 'original':
                ctx.drawImage(this.originalImage, 0, 0);
                break;
            case 'mask':
                this.renderMask(ctx, canvas);
                break;
            case 'result':
            default:
                this.renderResult(ctx, canvas);
                break;
        }
    }

    renderSideBySide() {
        if (!this.originalImage || !this.segmentationMask) return;

        const origCanvas = document.getElementById('originalCanvas');
        const resultCanvas = document.getElementById('resultCanvas');
        const origCtx = origCanvas.getContext('2d');
        const resultCtx = resultCanvas.getContext('2d');

        origCanvas.width = this.originalImage.width;
        origCanvas.height = this.originalImage.height;
        resultCanvas.width = this.originalImage.width;
        resultCanvas.height = this.originalImage.height;

        origCtx.drawImage(this.originalImage, 0, 0);
        this.renderResult(resultCtx, resultCanvas);
    }

    renderMask(ctx, canvas) {
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = this.segmentationMask.width;
        maskCanvas.height = this.segmentationMask.height;
        const maskCtx = maskCanvas.getContext('2d');
        maskCtx.drawImage(this.segmentationMask, 0, 0);

        ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
    }

    renderResult(ctx, canvas) {
        const width = canvas.width;
        const height = canvas.height;

        this.drawBackground(ctx, width, height);

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = width;
        maskCanvas.height = height;
        const maskCtx = maskCanvas.getContext('2d');
        maskCtx.drawImage(this.segmentationMask, 0, 0, width, height);

        const maskImageData = maskCtx.getImageData(0, 0, width, height);
        const maskData = maskImageData.data;

        const threshold = this.settings.threshold / 100 * 255;
        const smoothness = this.settings.smoothness;

        if (smoothness > 0) {
            this.gaussianBlur(maskData, width, height, smoothness);
        }

        for (let i = 0; i < maskData.length; i += 4) {
            const alpha = maskData[i];
            if (alpha > threshold) {
                maskData[i + 3] = Math.min(255, (alpha - threshold) * (255 / (255 - threshold)));
            } else {
                maskData[i + 3] = 0;
            }
        }

        maskCtx.putImageData(maskImageData, 0, 0);

        const foregroundCanvas = document.createElement('canvas');
        foregroundCanvas.width = width;
        foregroundCanvas.height = height;
        const fgCtx = foregroundCanvas.getContext('2d');

        fgCtx.filter = `brightness(${this.settings.brightness}%) contrast(${this.settings.contrast}%)`;
        fgCtx.drawImage(this.originalImage, 0, 0);

        fgCtx.globalCompositeOperation = 'destination-in';
        fgCtx.drawImage(maskCanvas, 0, 0);

        ctx.drawImage(foregroundCanvas, 0, 0);
    }

    drawBackground(ctx, width, height) {
        switch (this.settings.bgType) {
            case 'color':
                ctx.fillStyle = this.settings.bgColor;
                ctx.fillRect(0, 0, width, height);
                break;

            case 'gradient':
                const angle = this.settings.gradient.angle * Math.PI / 180;
                const centerX = width / 2;
                const centerY = height / 2;
                const maxDist = Math.sqrt(width * width + height * height) / 2;
                
                const x1 = centerX - Math.cos(angle) * maxDist;
                const y1 = centerY - Math.sin(angle) * maxDist;
                const x2 = centerX + Math.cos(angle) * maxDist;
                const y2 = centerY + Math.sin(angle) * maxDist;

                const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
                gradient.addColorStop(0, this.settings.gradient.start);
                gradient.addColorStop(1, this.settings.gradient.end);
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, width, height);
                break;

            case 'image':
                if (this.backgroundImage) {
                    const bgWidth = this.backgroundImage.width;
                    const bgHeight = this.backgroundImage.height;
                    const imgRatio = bgWidth / bgHeight;
                    const canvasRatio = width / height;

                    let drawWidth, drawHeight, offsetX, offsetY;

                    switch (this.settings.bgFitMode) {
                        case 'contain':
                            if (imgRatio > canvasRatio) {
                                drawWidth = width;
                                drawHeight = width / imgRatio;
                                offsetX = 0;
                                offsetY = (height - drawHeight) / 2;
                            } else {
                                drawHeight = height;
                                drawWidth = height * imgRatio;
                                offsetX = (width - drawWidth) / 2;
                                offsetY = 0;
                            }
                            break;
                        case 'fill':
                            drawWidth = width;
                            drawHeight = height;
                            offsetX = 0;
                            offsetY = 0;
                            break;
                        case 'cover':
                        default:
                            if (imgRatio > canvasRatio) {
                                drawHeight = height;
                                drawWidth = height * imgRatio;
                                offsetX = (width - drawWidth) / 2;
                                offsetY = 0;
                            } else {
                                drawWidth = width;
                                drawHeight = width / imgRatio;
                                offsetX = 0;
                                offsetY = (height - drawHeight) / 2;
                            }
                            break;
                    }

                    ctx.drawImage(this.backgroundImage, offsetX, offsetY, drawWidth, drawHeight);
                } else {
                    ctx.fillStyle = '#cccccc';
                    ctx.fillRect(0, 0, width, height);
                    ctx.fillStyle = '#999999';
                    ctx.font = '20px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText('请上传背景图片', width / 2, height / 2);
                }
                break;

            case 'transparent':
            default:
                ctx.clearRect(0, 0, width, height);
                break;
        }
    }

    gaussianBlur(data, width, height, radius) {
        const temp = new Uint8ClampedArray(data.length);
        const sigma = radius / 3;
        const kernelSize = Math.ceil(radius * 2) + 1;
        const kernel = [];
        let sum = 0;

        for (let i = 0; i < kernelSize; i++) {
            const x = i - Math.floor(kernelSize / 2);
            const value = Math.exp(-(x * x) / (2 * sigma * sigma));
            kernel.push(value);
            sum += value;
        }

        for (let i = 0; i < kernelSize; i++) {
            kernel[i] /= sum;
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                for (let k = 0; k < kernelSize; k++) {
                    const px = Math.min(width - 1, Math.max(0, x + k - Math.floor(kernelSize / 2)));
                    const idx = (y * width + px) * 4;
                    r += data[idx] * kernel[k];
                    g += data[idx + 1] * kernel[k];
                    b += data[idx + 2] * kernel[k];
                    a += data[idx + 3] * kernel[k];
                }
                const idx = (y * width + x) * 4;
                temp[idx] = r;
                temp[idx + 1] = g;
                temp[idx + 2] = b;
                temp[idx + 3] = a;
            }
        }

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0;
                for (let k = 0; k < kernelSize; k++) {
                    const py = Math.min(height - 1, Math.max(0, y + k - Math.floor(kernelSize / 2)));
                    const idx = (py * width + x) * 4;
                    r += temp[idx] * kernel[k];
                    g += temp[idx + 1] * kernel[k];
                    b += temp[idx + 2] * kernel[k];
                    a += temp[idx + 3] * kernel[k];
                }
                const idx = (y * width + x) * 4;
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = a;
            }
        }
    }

    downloadImage() {
        let format = this.settings.downloadFormat;
        
        if (this.settings.bgType === 'transparent' && format !== 'png') {
            const confirmed = confirm('⚠️ 当前选择了透明背景，但下载格式不是 PNG。\nJPEG/WebP 不支持透明通道，下载后透明区域会变成白色。\n\n是否自动切换为 PNG 格式下载？');
            if (confirmed) {
                format = 'png';
            }
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = this.originalImage.width;
        canvas.height = this.originalImage.height;

        if (this.settings.bgType === 'transparent' && format !== 'png') {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else {
            this.drawBackground(ctx, canvas.width, canvas.height);
        }

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        const maskCtx = maskCanvas.getContext('2d');
        maskCtx.drawImage(this.segmentationMask, 0, 0, canvas.width, canvas.height);

        const maskImageData = maskCtx.getImageData(0, 0, canvas.width, canvas.height);
        const maskData = maskImageData.data;
        const threshold = this.settings.threshold / 100 * 255;
        const smoothness = this.settings.smoothness;

        if (smoothness > 0) {
            this.gaussianBlur(maskData, canvas.width, canvas.height, smoothness);
        }

        for (let i = 0; i < maskData.length; i += 4) {
            const alpha = maskData[i];
            if (alpha > threshold) {
                maskData[i + 3] = Math.min(255, (alpha - threshold) * (255 / (255 - threshold)));
            } else {
                maskData[i + 3] = 0;
            }
        }

        maskCtx.putImageData(maskImageData, 0, 0);

        const foregroundCanvas = document.createElement('canvas');
        foregroundCanvas.width = canvas.width;
        foregroundCanvas.height = canvas.height;
        const fgCtx = foregroundCanvas.getContext('2d');

        fgCtx.filter = `brightness(${this.settings.brightness}%) contrast(${this.settings.contrast}%)`;
        fgCtx.drawImage(this.originalImage, 0, 0);

        fgCtx.globalCompositeOperation = 'destination-in';
        fgCtx.drawImage(maskCanvas, 0, 0);

        ctx.drawImage(foregroundCanvas, 0, 0);

        const quality = this.settings.downloadQuality;
        const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
        
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bg-removed-${Date.now()}.${format}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, mimeType, quality);
    }

    showStatus(text, processing = false) {
        const status = document.getElementById('processingStatus');
        status.textContent = text;
        status.classList.toggle('processing', processing);
    }

    reset() {
        this.originalImage = null;
        this.backgroundImage = null;
        this.segmentationMask = null;

        document.getElementById('imageInput').value = '';
        document.getElementById('bgImageInput').value = '';
        document.getElementById('bgPreview').style.display = 'none';
        document.getElementById('controlsSection').style.display = 'none';
        document.getElementById('previewSection').style.display = 'none';
        document.querySelector('.upload-section').style.display = 'block';

        this.settings.bgType = 'color';
        this.settings.bgColor = '#ffffff';
        this.settings.smoothness = 5;
        this.settings.threshold = 50;
        this.settings.brightness = 100;
        this.settings.contrast = 100;

        document.getElementById('smoothness').value = 5;
        document.getElementById('smoothnessValue').textContent = '5';
        document.getElementById('threshold').value = 50;
        document.getElementById('thresholdValue').textContent = '50%';
        document.getElementById('brightness').value = 100;
        document.getElementById('brightnessValue').textContent = '100%';
        document.getElementById('contrast').value = 100;
        document.getElementById('contrastValue').textContent = '100%';

        this.switchTab('color');
        this.switchView('result');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new BackgroundRemover();
});
