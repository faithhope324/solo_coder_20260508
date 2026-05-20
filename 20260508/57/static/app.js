document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM 加载完成，开始初始化应用...');
    
    const app = {
        currentTaskId: null,
        selectedFile: null,
        videoUrl: null,
        trackingResults: null,
        currentFrameIndex: 0,
        isPlaying: false,
        linePoints: [],
        
        classColors: {
            'person': '#FF6B6B',
            'car': '#4ECDC4',
            'truck': '#45B7D1',
            'bicycle': '#96CEB4',
            'motorcycle': '#FFEAA7',
            'bus': '#DDA0DD'
        },
        
        elements: {},
        
        init() {
            console.log('开始初始化元素...');
            this.initElements();
            console.log('元素初始化完成:', Object.keys(this.elements));
            this.initEventListeners();
            console.log('事件监听器初始化完成');
            this.initCanvas();
            console.log('画布初始化完成');
            console.log('应用初始化完成！');
        },
        
        initElements() {
            this.elements = {
                uploadArea: document.getElementById('uploadArea'),
                videoFileInput: document.getElementById('videoFile'),
                uploadBtn: document.getElementById('uploadBtn'),
                processBtn: document.getElementById('processBtn'),
                downloadCsvBtn: document.getElementById('downloadCsvBtn'),
                resetAllBtn: document.getElementById('resetAllBtn'),
                
                videoPlayer: document.getElementById('videoPlayer'),
                overlayCanvas: document.getElementById('overlayCanvas'),
                lineCanvas: document.getElementById('lineCanvas'),
                videoPlaceholder: document.getElementById('videoPlaceholder'),
                
                taskInfo: document.getElementById('taskInfo'),
                taskIdSpan: document.getElementById('taskId'),
                fileNameSpan: document.getElementById('fileName'),
                taskStatusSpan: document.getElementById('taskStatus'),
                
                progressContainer: document.getElementById('progressContainer'),
                progressFill: document.getElementById('progressFill'),
                progressText: document.getElementById('progressText'),
                
                countsDisplay: document.getElementById('countsDisplay'),
                videoDurationSpan: document.getElementById('videoDuration'),
                totalFramesSpan: document.getElementById('totalFrames'),
                videoFpsSpan: document.getElementById('videoFps'),
                totalTracksSpan: document.getElementById('totalTracks'),
                
                frameInfo: document.getElementById('frameInfo'),
                prevFrameBtn: document.getElementById('prevFrameBtn'),
                nextFrameBtn: document.getElementById('nextFrameBtn'),
                playPauseBtn: document.getElementById('playPauseBtn'),
                frameSlider: document.getElementById('frameSlider'),
                
                confidenceThreshold: document.getElementById('confidenceThreshold'),
                confidenceValue: document.getElementById('confidenceValue'),
                frameInterval: document.getElementById('frameInterval'),
                frameIntervalValue: document.getElementById('frameIntervalValue'),
                
                targetClassesContainer: document.getElementById('targetClasses'),
                
                lineStartX: document.getElementById('lineStartX'),
                lineStartY: document.getElementById('lineStartY'),
                lineEndX: document.getElementById('lineEndX'),
                lineEndY: document.getElementById('lineEndY'),
                applyLineBtn: document.getElementById('applyLineBtn'),
                resetLineBtn: document.getElementById('resetLineBtn')
            };
            
            this.overlayCtx = this.elements.overlayCanvas.getContext('2d');
            this.lineCtx = this.elements.lineCanvas.getContext('2d');
        },
        
        initEventListeners() {
            const el = this.elements;
            
            el.uploadArea.addEventListener('click', () => {
                console.log('点击上传区域');
                el.videoFileInput.click();
            });
            
            el.videoFileInput.addEventListener('change', (e) => {
                console.log('文件选择改变:', e.target.files);
                this.handleFileSelect(e);
            });
            
            el.uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                el.uploadArea.classList.add('dragover');
            });
            
            el.uploadArea.addEventListener('dragleave', () => {
                el.uploadArea.classList.remove('dragover');
            });
            
            el.uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                el.uploadArea.classList.remove('dragover');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.selectedFile = files[0];
                    this.updateUploadUI();
                }
            });
            
            el.uploadBtn.addEventListener('click', () => {
                console.log('点击上传按钮');
                this.uploadVideo();
            });
            
            el.processBtn.addEventListener('click', () => {
                console.log('点击处理按钮');
                this.processVideo();
            });
            
            el.downloadCsvBtn.addEventListener('click', () => {
                console.log('点击下载按钮');
                this.downloadCSV();
            });
            
            el.resetAllBtn.addEventListener('click', () => {
                console.log('点击重置按钮');
                this.resetAll();
            });
            
            el.confidenceThreshold.addEventListener('input', () => {
                console.log('置信度改变:', el.confidenceThreshold.value);
                el.confidenceValue.textContent = el.confidenceThreshold.value;
            });
            
            el.frameInterval.addEventListener('input', () => {
                console.log('帧间隔改变:', el.frameInterval.value);
                el.frameIntervalValue.textContent = el.frameInterval.value;
            });
            
            el.applyLineBtn.addEventListener('click', () => {
                console.log('点击应用计数线');
                this.applyLine();
            });
            
            el.resetLineBtn.addEventListener('click', () => {
                console.log('点击重置计数线');
                this.resetLine();
            });
            
            el.lineCanvas.addEventListener('click', (e) => {
                this.handleCanvasClick(e);
            });
            
            el.videoPlayer.addEventListener('loadedmetadata', () => {
                console.log('视频元数据加载完成');
                this.handleVideoLoaded();
            });
            
            el.videoPlayer.addEventListener('play', () => {
                this.isPlaying = true;
                el.playPauseBtn.textContent = '⏸ 暂停';
            });
            
            el.videoPlayer.addEventListener('pause', () => {
                this.isPlaying = false;
                el.playPauseBtn.textContent = '▶ 播放';
            });
            
            el.videoPlayer.addEventListener('timeupdate', () => {
                this.handleTimeUpdate();
            });
            
            el.prevFrameBtn.addEventListener('click', () => this.prevFrame());
            el.nextFrameBtn.addEventListener('click', () => this.nextFrame());
            el.playPauseBtn.addEventListener('click', () => this.togglePlayPause());
            el.frameSlider.addEventListener('input', () => this.handleSliderChange());
            
            console.log('所有事件监听器已绑定');
        },
        
        initCanvas() {
            const rect = this.elements.lineCanvas.parentElement.getBoundingClientRect();
            this.elements.lineCanvas.width = rect.width;
            this.elements.lineCanvas.height = rect.height;
            this.elements.overlayCanvas.width = rect.width;
            this.elements.overlayCanvas.height = rect.height;
        },
        
        handleFileSelect(e) {
            const files = e.target.files;
            if (files.length > 0) {
                this.selectedFile = files[0];
                console.log('已选择文件:', this.selectedFile.name);
                this.updateUploadUI();
            }
        },
        
        updateUploadUI() {
            const el = this.elements;
            if (this.selectedFile) {
                el.uploadBtn.disabled = false;
                const name = this.selectedFile.name;
                el.fileNameSpan.textContent = name.length > 30 ? name.substring(0, 27) + '...' : name;
                console.log('上传按钮已启用');
            }
        },
        
        async uploadVideo() {
            if (!this.selectedFile) {
                alert('请先选择视频文件');
                return;
            }
            
            const el = this.elements;
            const formData = new FormData();
            formData.append('file', this.selectedFile);
            
            try {
                el.uploadBtn.disabled = true;
                el.uploadBtn.textContent = '上传中...';
                
                console.log('开始上传视频...');
                const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                });
                
                const result = await response.json();
                
                if (response.ok) {
                    this.currentTaskId = result.task_id;
                    el.taskIdSpan.textContent = this.currentTaskId;
                    el.taskStatusSpan.textContent = '已上传';
                    el.taskInfo.style.display = 'block';
                    el.processBtn.disabled = false;
                    
                    const ext = this.getFileExtension(this.selectedFile.name);
                    this.videoUrl = `/uploads/${this.currentTaskId}${ext}`;
                    el.videoPlayer.src = this.videoUrl;
                    el.videoPlayer.style.display = 'block';
                    el.videoPlaceholder.style.display = 'none';
                    
                    this.initCanvas();
                    console.log('视频上传成功，任务ID:', this.currentTaskId);
                } else {
                    alert('上传失败: ' + result.detail);
                }
            } catch (error) {
                console.error('上传错误:', error);
                alert('上传失败，请重试');
            } finally {
                el.uploadBtn.disabled = false;
                el.uploadBtn.textContent = '开始上传';
            }
        },
        
        getFileExtension(filename) {
            return filename.substring(filename.lastIndexOf('.')).toLowerCase();
        },
        
        async processVideo() {
            if (!this.currentTaskId) {
                alert('请先上传视频');
                return;
            }
            
            const el = this.elements;
            const targetClasses = Array.from(el.targetClassesContainer.querySelectorAll('input[type="checkbox"]:checked'))
                .map(cb => cb.value).join(',');
            
            console.log('目标类别:', targetClasses);
            
            const formData = new FormData();
            formData.append('task_id', this.currentTaskId);
            formData.append('target_classes', targetClasses);
            formData.append('line_start', `${el.lineStartX.value},${el.lineStartY.value}`);
            formData.append('line_end', `${el.lineEndX.value},${el.lineEndY.value}`);
            formData.append('confidence_threshold', el.confidenceThreshold.value);
            formData.append('frame_interval', el.frameInterval.value);
            
            try {
                el.processBtn.disabled = true;
                el.processBtn.textContent = '处理中...';
                el.progressContainer.style.display = 'block';
                
                console.log('开始处理视频...');
                const response = await fetch('/api/process', {
                    method: 'POST',
                    body: formData
                });
                
                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || '处理失败');
                }
                
                await this.monitorProgress();
                
            } catch (error) {
                console.error('处理错误:', error);
                alert('处理失败: ' + error.message);
                el.taskStatusSpan.textContent = '失败';
            } finally {
                el.processBtn.disabled = false;
                el.processBtn.textContent = '开始处理视频';
            }
        },
        
        async monitorProgress() {
            return new Promise((resolve, reject) => {
                const checkStatus = async () => {
                    try {
                        const response = await fetch(`/api/status?task_id=${this.currentTaskId}`);
                        const status = await response.json();
                        
                        if (status.progress !== undefined) {
                            this.elements.progressFill.style.width = status.progress + '%';
                            this.elements.progressText.textContent = status.progress + '%';
                        }
                        
                        if (status.status === 'completed') {
                            await this.loadResults();
                            this.elements.taskStatusSpan.textContent = '已完成';
                            this.elements.downloadCsvBtn.disabled = false;
                            resolve();
                        } else if (status.status === 'failed') {
                            reject(new Error(status.error || '处理失败'));
                        } else if (status.status === 'processing') {
                            setTimeout(checkStatus, 1000);
                        } else {
                            setTimeout(checkStatus, 500);
                        }
                    } catch (error) {
                        reject(error);
                    }
                };
                
                checkStatus();
            });
        },
        
        async loadResults() {
            try {
                const response = await fetch(`/api/results/${this.currentTaskId}`);
                this.trackingResults = await response.json();
                
                console.log('已加载结果:', this.trackingResults);
                this.updateStatsDisplay();
                this.updateCountsDisplay();
                this.enableFrameControls();
                
                this.elements.videoPlayer.pause();
                this.elements.videoPlayer.currentTime = 0;
                
                this.renderFrame(0);
                
            } catch (error) {
                console.error('加载结果错误:', error);
            }
        },
        
        updateStatsDisplay() {
            if (!this.trackingResults) return;
            
            const el = this.elements;
            const videoInfo = this.trackingResults.video_info || {};
            el.videoDurationSpan.textContent = this.formatTime(videoInfo.duration || 0);
            el.totalFramesSpan.textContent = videoInfo.total_frames || 0;
            el.videoFpsSpan.textContent = (videoInfo.fps || 0).toFixed(1);
            el.totalTracksSpan.textContent = this.trackingResults.total_tracks || 0;
            
            el.frameSlider.max = (videoInfo.total_frames || 1) - 1;
            el.frameSlider.style.display = 'block';
        },
        
        updateCountsDisplay() {
            if (!this.trackingResults) return;
            
            const el = this.elements;
            const counts = this.trackingResults.counts || {};
            const total = this.trackingResults.total_counts || { in: 0, out: 0, total: 0 };
            
            let html = `
                <div class="count-item total">
                    <span class="count-label">总计</span>
                    <div class="count-values">
                        <span class="in-count">进: ${total.in || 0}</span>
                        <span class="out-count">出: ${total.out || 0}</span>
                        <span class="total-count">总: ${total.total || 0}</span>
                    </div>
                </div>
            `;
            
            for (const [className, classCounts] of Object.entries(counts)) {
                if (classCounts.total > 0) {
                    const color = this.classColors[className] || '#666';
                    html += `
                        <div class="count-item" style="border-left-color: ${color};">
                            <span class="count-label">${className}</span>
                            <div class="count-values">
                                <span class="in-count">进: ${classCounts.in || 0}</span>
                                <span class="out-count">出: ${classCounts.out || 0}</span>
                                <span class="total-count">总: ${classCounts.total || 0}</span>
                            </div>
                        </div>
                    `;
                }
            }
            
            el.countsDisplay.innerHTML = html;
        },
        
        enableFrameControls() {
            const el = this.elements;
            el.prevFrameBtn.disabled = false;
            el.nextFrameBtn.disabled = false;
            el.playPauseBtn.disabled = false;
            el.frameSlider.disabled = false;
        },
        
        handleVideoLoaded() {
            this.initCanvas();
            this.drawCountingLine();
        },
        
        handleTimeUpdate() {
            if (this.trackingResults && this.trackingResults.video_info) {
                const el = this.elements;
                const fps = this.trackingResults.video_info.fps || 30;
                const currentFrame = Math.floor(el.videoPlayer.currentTime * fps);
                this.currentFrameIndex = currentFrame;
                el.frameSlider.value = currentFrame;
                this.updateFrameInfo();
                this.renderFrame(currentFrame);
            }
        },
        
        togglePlayPause() {
            const el = this.elements;
            if (el.videoPlayer.paused) {
                el.videoPlayer.play();
            } else {
                el.videoPlayer.pause();
            }
        },
        
        prevFrame() {
            if (this.currentFrameIndex > 0) {
                this.currentFrameIndex--;
                this.seekToFrame(this.currentFrameIndex);
            }
        },
        
        nextFrame() {
            const maxFrame = this.trackingResults?.video_info?.total_frames || 0;
            if (this.currentFrameIndex < maxFrame - 1) {
                this.currentFrameIndex++;
                this.seekToFrame(this.currentFrameIndex);
            }
        },
        
        handleSliderChange() {
            this.currentFrameIndex = parseInt(this.elements.frameSlider.value);
            this.seekToFrame(this.currentFrameIndex);
        },
        
        seekToFrame(frameIndex) {
            if (this.trackingResults && this.trackingResults.video_info) {
                const el = this.elements;
                const fps = this.trackingResults.video_info.fps || 30;
                el.videoPlayer.currentTime = frameIndex / fps;
                this.updateFrameInfo();
                this.renderFrame(frameIndex);
            }
        },
        
        updateFrameInfo() {
            const maxFrame = this.trackingResults?.video_info?.total_frames || 0;
            this.elements.frameInfo.textContent = `帧: ${this.currentFrameIndex} / ${maxFrame - 1}`;
        },
        
        renderFrame(frameIndex) {
            if (!this.trackingResults || !this.trackingResults.frames) return;
            
            const frameData = this.findNearestFrame(frameIndex);
            if (!frameData) return;
            
            const el = this.elements;
            this.overlayCtx.clearRect(0, 0, el.overlayCanvas.width, el.overlayCanvas.height);
            
            const videoWidth = el.videoPlayer.videoWidth;
            const videoHeight = el.videoPlayer.videoHeight;
            const canvasWidth = el.overlayCanvas.width;
            const canvasHeight = el.overlayCanvas.height;
            
            const scale = Math.min(canvasWidth / videoWidth, canvasHeight / videoHeight);
            const offsetX = (canvasWidth - videoWidth * scale) / 2;
            const offsetY = (canvasHeight - videoHeight * scale) / 2;
            
            for (const det of frameData.detections) {
                const bbox = det.bbox;
                const x1 = offsetX + bbox[0] * scale;
                const y1 = offsetY + bbox[1] * scale;
                const x2 = offsetX + bbox[2] * scale;
                const y2 = offsetY + bbox[3] * scale;
                
                const color = this.classColors[det.class_name] || '#666';
                
                this.overlayCtx.strokeStyle = color;
                this.overlayCtx.lineWidth = 2;
                this.overlayCtx.strokeRect(x1, y1, x2 - x1, y2 - y1);
                
                this.overlayCtx.fillStyle = color;
                this.overlayCtx.fillRect(x1, y1 - 20, 100, 20);
                
                this.overlayCtx.fillStyle = 'white';
                this.overlayCtx.font = 'bold 12px sans-serif';
                this.overlayCtx.fillText(`#${det.track_id} ${det.class_name}`, x1 + 4, y1 - 5);
                
                if (det.trajectory && det.trajectory.length > 1) {
                    this.overlayCtx.strokeStyle = color;
                    this.overlayCtx.lineWidth = 2;
                    this.overlayCtx.globalAlpha = 0.6;
                    this.overlayCtx.beginPath();
                    
                    for (let i = 0; i < det.trajectory.length; i++) {
                        const point = det.trajectory[i];
                        const px = offsetX + point[0] * scale;
                        const py = offsetY + point[1] * scale;
                        
                        if (i === 0) {
                            this.overlayCtx.moveTo(px, py);
                        } else {
                            this.overlayCtx.lineTo(px, py);
                        }
                    }
                    
                    this.overlayCtx.stroke();
                    this.overlayCtx.globalAlpha = 1;
                }
            }
            
            this.drawCountingLine();
        },
        
        findNearestFrame(frameIndex) {
            if (!this.trackingResults || !this.trackingResults.frames) return null;
            
            let nearestFrame = null;
            let minDiff = Infinity;
            
            for (const frame of this.trackingResults.frames) {
                const diff = Math.abs(frame.frame_number - frameIndex);
                if (diff < minDiff) {
                    minDiff = diff;
                    nearestFrame = frame;
                }
            }
            
            return nearestFrame;
        },
        
        handleCanvasClick(e) {
            const el = this.elements;
            if (!el.videoPlayer.videoWidth) return;
            
            const rect = el.lineCanvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const videoWidth = el.videoPlayer.videoWidth;
            const videoHeight = el.videoPlayer.videoHeight;
            const scale = Math.min(el.lineCanvas.width / videoWidth, el.lineCanvas.height / videoHeight);
            const offsetX = (el.lineCanvas.width - videoWidth * scale) / 2;
            const offsetY = (el.lineCanvas.height - videoHeight * scale) / 2;
            
            const normalizedX = (x - offsetX) / (videoWidth * scale);
            const normalizedY = (y - offsetY) / (videoHeight * scale);
            
            if (normalizedX < 0 || normalizedX > 1 || normalizedY < 0 || normalizedY > 1) return;
            
            this.linePoints.push([normalizedX, normalizedY]);
            console.log('点击点:', normalizedX, normalizedY);
            
            if (this.linePoints.length === 1) {
                el.lineStartX.value = normalizedX.toFixed(2);
                el.lineStartY.value = normalizedY.toFixed(2);
            } else if (this.linePoints.length === 2) {
                el.lineEndX.value = normalizedX.toFixed(2);
                el.lineEndY.value = normalizedY.toFixed(2);
                this.drawCountingLine();
                this.linePoints = [];
                console.log('计数线设置完成');
            }
        },
        
        applyLine() {
            this.linePoints = [];
            this.drawCountingLine();
            console.log('计数线已应用');
        },
        
        resetLine() {
            const el = this.elements;
            el.lineStartX.value = 0.5;
            el.lineStartY.value = 0;
            el.lineEndX.value = 0.5;
            el.lineEndY.value = 1;
            this.linePoints = [];
            this.drawCountingLine();
            console.log('计数线已重置');
        },
        
        resetAll() {
            if (!confirm('确定要重置所有设置和数据吗？')) return;
            
            console.log('开始重置所有...');
            
            this.selectedFile = null;
            this.currentTaskId = null;
            this.videoUrl = null;
            this.trackingResults = null;
            this.currentFrameIndex = 0;
            this.isPlaying = false;
            this.linePoints = [];
            
            const el = this.elements;
            
            el.videoFileInput.value = '';
            el.uploadBtn.disabled = true;
            
            el.videoPlayer.pause();
            el.videoPlayer.removeAttribute('src');
            el.videoPlayer.load();
            el.videoPlayer.style.display = 'none';
            el.videoPlaceholder.style.display = 'flex';
            
            el.taskInfo.style.display = 'none';
            el.taskIdSpan.textContent = '-';
            el.fileNameSpan.textContent = '-';
            el.taskStatusSpan.textContent = '-';
            
            el.processBtn.disabled = true;
            el.downloadCsvBtn.disabled = true;
            
            el.progressContainer.style.display = 'none';
            el.progressFill.style.width = '0%';
            el.progressText.textContent = '0%';
            
            el.confidenceThreshold.value = 0.5;
            el.confidenceValue.textContent = '0.5';
            el.frameInterval.value = 1;
            el.frameIntervalValue.textContent = '1';
            
            const checkboxes = el.targetClassesContainer.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(cb => cb.checked = true);
            
            el.lineStartX.value = 0.5;
            el.lineStartY.value = 0;
            el.lineEndX.value = 0.5;
            el.lineEndY.value = 1;
            
            this.overlayCtx.clearRect(0, 0, el.overlayCanvas.width, el.overlayCanvas.height);
            this.lineCtx.clearRect(0, 0, el.lineCanvas.width, el.lineCanvas.height);
            
            el.countsDisplay.innerHTML = `
                <div class="count-item total">
                    <span class="count-label">总计</span>
                    <div class="count-values">
                        <span class="in-count">进: 0</span>
                        <span class="out-count">出: 0</span>
                        <span class="total-count">总: 0</span>
                    </div>
                </div>
            `;
            
            el.videoDurationSpan.textContent = '-';
            el.totalFramesSpan.textContent = '-';
            el.videoFpsSpan.textContent = '-';
            el.totalTracksSpan.textContent = '-';
            
            el.frameInfo.textContent = '帧: 0 / 0';
            el.prevFrameBtn.disabled = true;
            el.nextFrameBtn.disabled = true;
            el.playPauseBtn.disabled = true;
            el.frameSlider.style.display = 'none';
            el.frameSlider.value = 0;
            
            this.drawCountingLine();
            
            console.log('重置完成');
            alert('已重置所有设置和数据');
        },
        
        drawCountingLine() {
            const el = this.elements;
            this.lineCtx.clearRect(0, 0, el.lineCanvas.width, el.lineCanvas.height);
            
            if (!el.videoPlayer.videoWidth) return;
            
            const videoWidth = el.videoPlayer.videoWidth;
            const videoHeight = el.videoPlayer.videoHeight;
            const scale = Math.min(el.lineCanvas.width / videoWidth, el.lineCanvas.height / videoHeight);
            const offsetX = (el.lineCanvas.width - videoWidth * scale) / 2;
            const offsetY = (el.lineCanvas.height - videoHeight * scale) / 2;
            
            const startX = parseFloat(el.lineStartX.value);
            const startY = parseFloat(el.lineStartY.value);
            const endX = parseFloat(el.lineEndX.value);
            const endY = parseFloat(el.lineEndY.value);
            
            const x1 = offsetX + startX * videoWidth * scale;
            const y1 = offsetY + startY * videoHeight * scale;
            const x2 = offsetX + endX * videoWidth * scale;
            const y2 = offsetY + endY * videoHeight * scale;
            
            this.lineCtx.strokeStyle = '#FFD700';
            this.lineCtx.lineWidth = 3;
            this.lineCtx.setLineDash([10, 5]);
            this.lineCtx.beginPath();
            this.lineCtx.moveTo(x1, y1);
            this.lineCtx.lineTo(x2, y2);
            this.lineCtx.stroke();
            this.lineCtx.setLineDash([]);
            
            this.lineCtx.fillStyle = '#FFD700';
            this.lineCtx.beginPath();
            this.lineCtx.arc(x1, y1, 6, 0, Math.PI * 2);
            this.lineCtx.fill();
            
            this.lineCtx.beginPath();
            this.lineCtx.arc(x2, y2, 6, 0, Math.PI * 2);
            this.lineCtx.fill();
            
            this.lineCtx.fillStyle = 'white';
            this.lineCtx.font = 'bold 12px sans-serif';
            this.lineCtx.textAlign = 'center';
            this.lineCtx.fillText('起点', x1, y1 - 12);
            this.lineCtx.fillText('终点', x2, y2 - 12);
        },
        
        async downloadCSV() {
            if (!this.currentTaskId) {
                alert('请先处理视频');
                return;
            }
            
            try {
                const response = await fetch(`/api/download/${this.currentTaskId}/csv`);
                if (!response.ok) throw new Error('下载失败');
                
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `tracking_results_${this.currentTaskId}.csv`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
            } catch (error) {
                console.error('下载错误:', error);
                alert('下载失败，请重试');
            }
        },
        
        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    };
    
    app.init();
});
