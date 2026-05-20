const API_BASE = window.location.origin;

let currentTaskId = null;
let selectedFile = null;
let mediaRecorder = null;
let recordedChunks = [];
let recordingStartTime = null;
let recordingTimer = null;
let isRecording = false;
let trackWaveSurfers = {};
let trackMuted = {};
let trackVolumes = {};
let currentWebSocket = null;

const elements = {
    uploadTab: document.getElementById('upload-tab'),
    recordTab: document.getElementById('record-tab'),
    historyTab: document.getElementById('history-tab'),
    uploadPanel: document.getElementById('upload-panel'),
    recordPanel: document.getElementById('record-panel'),
    historyPanel: document.getElementById('history-panel'),
    uploadArea: document.getElementById('upload-area'),
    fileInput: document.getElementById('file-input'),
    fileInfo: document.getElementById('file-info'),
    fileName: document.getElementById('file-name'),
    removeFile: document.getElementById('remove-file'),
    recordBtn: document.getElementById('record-btn'),
    recordText: document.getElementById('record-text'),
    recordingStatus: document.getElementById('recording-status'),
    recordingTime: document.getElementById('recording-time'),
    segmentDuration: document.getElementById('segment-duration'),
    separateBtn: document.getElementById('separate-btn'),
    cancelBtn: document.getElementById('cancel-btn'),
    progressSection: document.getElementById('progress-section'),
    progressFill: document.getElementById('progress-fill'),
    progressText: document.getElementById('progress-text'),
    progressPercent: document.getElementById('progress-percent'),
    resultsSection: document.getElementById('results-section'),
    tracksContainer: document.getElementById('tracks-container'),
    playAllBtn: document.getElementById('play-all-btn'),
    stopAllBtn: document.getElementById('stop-all-btn'),
    downloadAllBtn: document.getElementById('download-all-btn'),
    historyList: document.getElementById('history-list'),
    refreshHistory: document.getElementById('refresh-history')
};

elements.uploadTab.addEventListener('click', () => switchTab('upload'));
elements.recordTab.addEventListener('click', () => switchTab('record'));
elements.historyTab.addEventListener('click', () => {
    switchTab('history');
    loadHistory();
});
elements.uploadArea.addEventListener('click', () => elements.fileInput.click());
elements.fileInput.addEventListener('change', handleFileSelect);
elements.removeFile.addEventListener('click', clearSelectedFile);
elements.separateBtn.addEventListener('click', startSeparation);
elements.cancelBtn.addEventListener('click', cancelSeparation);
elements.recordBtn.addEventListener('click', toggleRecording);
elements.playAllBtn.addEventListener('click', playAllTracks);
elements.stopAllBtn.addEventListener('click', stopAllTracks);
elements.downloadAllBtn.addEventListener('click', downloadAllTracks);
elements.refreshHistory.addEventListener('click', loadHistory);

elements.uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.uploadArea.classList.add('dragover');
});

elements.uploadArea.addEventListener('dragleave', () => {
    elements.uploadArea.classList.remove('dragover');
});

elements.uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.uploadArea.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFile(files[0]);
    }
});

function switchTab(tab) {
    const tabs = ['upload', 'record', 'history'];
    tabs.forEach(t => {
        document.getElementById(`${t}-tab`).classList.toggle('active', t === tab);
        document.getElementById(`${t}-panel`).classList.toggle('active', t === tab);
    });

    if (tab !== 'record') {
        stopRecording();
    }
    if (tab !== 'upload') {
        clearSelectedFile();
    }
}

function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
}

function handleFile(file) {
    if (!file.type.startsWith('audio/')) {
        alert('请选择音频文件');
        return;
    }

    const maxSize = 500 * 1024 * 1024;
    if (file.size > maxSize) {
        alert(`文件太大！最大支持 ${maxSize / (1024 * 1024)} MB`);
        return;
    }

    selectedFile = file;
    elements.fileName.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
    elements.uploadArea.classList.add('hidden');
    elements.fileInfo.classList.remove('hidden');
    updateSeparateBtn();
}

function clearSelectedFile() {
    selectedFile = null;
    elements.fileInput.value = '';
    elements.uploadArea.classList.remove('hidden');
    elements.fileInfo.classList.add('hidden');
    updateSeparateBtn();
}

async function toggleRecording() {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        recordedChunks = [];

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'audio/wav' });
            const maxSize = 500 * 1024 * 1024;
            if (blob.size > maxSize) {
                alert(`录音文件太大！最大支持 ${maxSize / (1024 * 1024)} MB`);
                return;
            }
            selectedFile = new File([blob], 'recording.wav', { type: 'audio/wav' });
            updateSeparateBtn();
        };

        mediaRecorder.start();
        isRecording = true;
        recordingStartTime = Date.now();
        elements.recordBtn.classList.add('recording');
        elements.recordText.textContent = '停止录制';
        elements.recordingStatus.classList.remove('hidden');

        recordingTimer = setInterval(updateRecordingTime, 1000);
    } catch (error) {
        console.error('录音失败:', error);
        alert('无法访问麦克风，请检查权限设置');
    }
}

function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        mediaRecorder.stream.getTracks().forEach(track => track.stop());
        isRecording = false;
        clearInterval(recordingTimer);
        elements.recordBtn.classList.remove('recording');
        elements.recordText.textContent = '开始录制';
        elements.recordingStatus.classList.add('hidden');
    }
}

function updateRecordingTime() {
    const elapsed = Math.floor((Date.now() - recordingStartTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    elements.recordingTime.textContent = `${minutes}:${seconds}`;
}

function updateSeparateBtn() {
    elements.separateBtn.disabled = !selectedFile;
}

async function startSeparation() {
    if (!selectedFile) return;

    elements.separateBtn.disabled = true;
    elements.cancelBtn.classList.remove('hidden');
    elements.cancelBtn.disabled = false;
    elements.progressSection.classList.remove('hidden');
    elements.resultsSection.classList.add('hidden');

    updateProgress(0, '正在上传文件...');

    try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadResponse = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            body: formData
        });

        if (!uploadResponse.ok) {
            const error = await uploadResponse.json();
            throw new Error(error.detail || '文件上传失败');
        }

        const uploadData = await uploadResponse.json();
        currentTaskId = uploadData.task_id;

        connectWebSocket(currentTaskId);

        const segmentDuration = parseInt(elements.segmentDuration.value) || 10;
        if (segmentDuration < 5 || segmentDuration > 60) {
            throw new Error('分段时长必须在 5-60 秒之间');
        }

        const sepResponse = await fetch(`${API_BASE}/api/separate/${currentTaskId}?segment_duration=${segmentDuration}`, {
            method: 'POST'
        });

        if (!sepResponse.ok) {
            const error = await sepResponse.json();
            throw new Error(error.detail || '分离启动失败');
        }

    } catch (error) {
        console.error('分离失败:', error);
        updateProgress(0, `错误: ${error.message}`);
        elements.separateBtn.disabled = false;
        elements.cancelBtn.classList.add('hidden');
    }
}

async function cancelSeparation() {
    if (!currentTaskId) return;

    if (!confirm('确定要取消分离任务吗？')) {
        return;
    }

    elements.cancelBtn.disabled = true;

    try {
        const response = await fetch(`${API_BASE}/api/cancel/${currentTaskId}`, {
            method: 'POST'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || '取消失败');
        }
    } catch (error) {
        console.error('取消失败:', error);
        alert(`取消失败: ${error.message}`);
        elements.cancelBtn.disabled = false;
    }
}

function connectWebSocket(taskId) {
    if (currentWebSocket) {
        currentWebSocket.close();
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws/progress/${taskId}`;
    const ws = new WebSocket(wsUrl);
    currentWebSocket = ws;

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        updateProgress(data.progress, data.message, data.status);

        if (data.status === 'completed' && data.result) {
            setTimeout(() => {
                displayResults(taskId, data.result);
                elements.cancelBtn.classList.add('hidden');
            }, 500);
        } else if (data.status === 'failed' || data.status === 'cancelled') {
            elements.separateBtn.disabled = false;
            elements.cancelBtn.classList.add('hidden');
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        console.log('WebSocket closed');
        currentWebSocket = null;
    };
}

function updateProgress(progress, message, status = 'processing') {
    const percent = Math.round(progress * 100);
    elements.progressFill.style.width = `${percent}%`;
    elements.progressText.textContent = message;
    elements.progressPercent.textContent = `${percent}%`;

    if (status === 'completed') {
        elements.progressFill.style.background = 'linear-gradient(90deg, #28a745 0%, #20c997 100%)';
    } else if (status === 'failed') {
        elements.progressFill.style.background = 'linear-gradient(90deg, #ff6b6b 0%, #ff5252 100%)';
    } else if (status === 'cancelled') {
        elements.progressFill.style.background = 'linear-gradient(90deg, #6c757d 0%, #5a6268 100%)';
    } else if (status === 'cancelling') {
        elements.progressFill.style.background = 'linear-gradient(90deg, #ffc107 0%, #e0a800 100%)';
    } else {
        elements.progressFill.style.background = 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)';
    }
}

async function loadHistory() {
    elements.historyList.innerHTML = '<p class="empty-history">加载中...</p>';

    try {
        const response = await fetch(`${API_BASE}/api/tasks?limit=50`);
        if (!response.ok) {
            throw new Error('加载历史失败');
        }

        const data = await response.json();

        if (data.tasks.length === 0) {
            elements.historyList.innerHTML = '<p class="empty-history">暂无历史任务</p>';
            return;
        }

        elements.historyList.innerHTML = '';
        data.tasks.forEach(task => {
            const item = document.createElement('div');
            item.className = 'history-item';
            item.onclick = () => loadTask(task.task_id);

            const dateStr = task.created_at ? new Date(task.created_at * 1000).toLocaleString() : '未知时间';
            const progressStr = task.status === 'completed' ? '100%' : `${Math.round(task.progress * 100)}%`;

            item.innerHTML = `
                <div class="history-info">
                    <div class="history-filename">${task.filename || '未命名'}</div>
                    <div class="history-meta">${dateStr} · ${progressStr}</div>
                </div>
                <span class="history-status ${task.status}">${getStatusText(task.status)}</span>
            `;

            elements.historyList.appendChild(item);
        });

    } catch (error) {
        console.error('加载历史失败:', error);
        elements.historyList.innerHTML = '<p class="empty-history">加载失败，请重试</p>';
    }
}

function getStatusText(status) {
    const statusMap = {
        'uploaded': '已上传',
        'processing': '处理中',
        'completed': '已完成',
        'failed': '失败',
        'cancelled': '已取消',
        'cancelling': '取消中',
        'interrupted': '已中断'
    };
    return statusMap[status] || status;
}

async function loadTask(taskId) {
    try {
        const response = await fetch(`${API_BASE}/api/tasks/${taskId}`);
        if (!response.ok) {
            throw new Error('加载任务失败');
        }

        const task = await response.json();

        if (task.status === 'completed' && task.result) {
            currentTaskId = taskId;
            switchTab('upload');
            elements.progressSection.classList.remove('hidden');
            updateProgress(1, '已完成', 'completed');
            displayResults(taskId, task.result);
        } else {
            alert(`任务状态: ${getStatusText(task.status)}\n${task.message || ''}`);
        }

    } catch (error) {
        console.error('加载任务失败:', error);
        alert(`加载失败: ${error.message}`);
    }
}

async function displayResults(taskId, result) {
    elements.resultsSection.classList.remove('hidden');
    elements.separateBtn.disabled = false;
    elements.tracksContainer.innerHTML = '';

    Object.values(trackWaveSurfers).forEach(ws => ws.destroy());
    trackWaveSurfers = {};
    trackMuted = {};
    trackVolumes = {};

    for (const source of result.sources) {
        trackMuted[source] = false;
        trackVolumes[source] = 1;

        const trackCard = document.createElement('div');
        trackCard.className = 'track-card';
        trackCard.id = `track-${source}`;

        trackCard.innerHTML = `
            <div class="track-header">
                <span class="track-name">${source}</span>
                <div class="track-controls">
                    <button class="track-btn play" id="play-${source}" data-source="${source}">
                        ▶ 播放
                    </button>
                    <button class="track-btn mute" id="mute-${source}" data-source="${source}">
                        🔊 静音
                    </button>
                    <button class="track-btn download" data-source="${source}">
                        ⬇ 下载
                    </button>
                </div>
            </div>
            <div class="waveform-container" id="waveform-${source}"></div>
            <div class="track-volume">
                <label>音量</label>
                <input type="range" id="volume-${source}" min="0" max="1" step="0.01" value="1">
                <span id="volume-value-${source}">100%</span>
            </div>
        `;

        elements.tracksContainer.appendChild(trackCard);

        const audioUrl = `${API_BASE}/api/audio/${taskId}/${source}`;
        trackWaveSurfers[source] = WaveSurfer.create({
            container: `#waveform-${source}`,
            waveColor: '#667eea',
            progressColor: '#764ba2',
            cursorColor: '#333',
            barWidth: 2,
            barRadius: 3,
            cursorWidth: 1,
            height: 80,
            barGap: 2,
            responsive: true
        });

        trackWaveSurfers[source].load(audioUrl);

        trackWaveSurfers[source].on('finish', () => {
            document.getElementById(`play-${source}`).textContent = '▶ 播放';
        });
    }

    document.querySelectorAll('.track-btn.play').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const source = e.target.dataset.source;
            togglePlay(source);
        });
    });

    document.querySelectorAll('.track-btn.mute').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const source = e.target.dataset.source;
            toggleMute(source);
        });
    });

    document.querySelectorAll('.track-btn.download').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const source = e.target.dataset.source;
            downloadTrack(taskId, source);
        });
    });

    document.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.addEventListener('input', (e) => {
            const source = e.target.id.replace('volume-', '');
            const volume = parseFloat(e.target.value);
            setVolume(source, volume);
        });
    });
}

function togglePlay(source) {
    const ws = trackWaveSurfers[source];
    const btn = document.getElementById(`play-${source}`);

    if (ws.isPlaying()) {
        ws.pause();
        btn.textContent = '▶ 播放';
    } else {
        ws.play();
        btn.textContent = '⏸ 暂停';
    }
}

function toggleMute(source) {
    trackMuted[source] = !trackMuted[source];
    const ws = trackWaveSurfers[source];
    const btn = document.getElementById(`mute-${source}`);

    if (trackMuted[source]) {
        ws.setVolume(0);
        btn.textContent = '🔇 取消静音';
        btn.classList.add('active');
    } else {
        ws.setVolume(trackVolumes[source]);
        btn.textContent = '🔊 静音';
        btn.classList.remove('active');
    }
}

function setVolume(source, volume) {
    trackVolumes[source] = volume;
    if (!trackMuted[source]) {
        trackWaveSurfers[source].setVolume(volume);
    }
    document.getElementById(`volume-value-${source}`).textContent = `${Math.round(volume * 100)}%`;
}

function playAllTracks() {
    Object.keys(trackWaveSurfers).forEach(source => {
        const ws = trackWaveSurfers[source];
        if (!ws.isPlaying()) {
            ws.play();
            document.getElementById(`play-${source}`).textContent = '⏸ 暂停';
        }
    });
}

function stopAllTracks() {
    Object.keys(trackWaveSurfers).forEach(source => {
        const ws = trackWaveSurfers[source];
        ws.stop();
        document.getElementById(`play-${source}`).textContent = '▶ 播放';
    });
}

function downloadTrack(taskId, source) {
    const link = document.createElement('a');
    link.href = `${API_BASE}/api/download/${taskId}/${source}`;
    link.download = `${taskId}_${source}.wav`;
    link.click();
}

function downloadAllTracks() {
    if (!currentTaskId) return;
    Object.keys(trackWaveSurfers).forEach((source, index) => {
        setTimeout(() => {
            downloadTrack(currentTaskId, source);
        }, index * 300);
    });
}

window.addEventListener('beforeunload', () => {
    stopRecording();
    Object.values(trackWaveSurfers).forEach(ws => ws.destroy());
    if (currentWebSocket) {
        currentWebSocket.close();
    }
});
