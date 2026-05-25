const API_BASE = 'http://localhost:8000';

let tasks = [];
let selectedTasks = new Set();
let currentView = 'grid';
let pollInterval = null;

const uploadArea = document.getElementById('upload-area');
const fileInput = document.getElementById('file-input');
const modelSelect = document.getElementById('model-select');
const scaleSelect = document.getElementById('scale-select');
const tasksContainer = document.getElementById('tasks-container');
const emptyState = document.getElementById('empty-state');
const batchActions = document.getElementById('batch-actions');
const selectedCountEl = document.getElementById('selected-count');
const downloadSelectedBtn = document.getElementById('download-selected');
const clearCompletedBtn = document.getElementById('clear-completed');
const compareModal = document.getElementById('compare-modal');

document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    startPolling();
    loadTasks();
});

function initEventListeners() {
    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            uploadFiles(Array.from(e.dataTransfer.files));
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            uploadFiles(Array.from(e.target.files));
            fileInput.value = '';
        }
    });

    downloadSelectedBtn.addEventListener('click', downloadSelected);

    clearCompletedBtn.addEventListener('click', clearCompleted);

    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentView = btn.dataset.view;
            tasksContainer.className = currentView === 'grid' ? 'tasks-grid' : 'tasks-list';
            renderTasks();
        });
    });

    document.getElementById('modal-close').addEventListener('click', closeModal);
    compareModal.addEventListener('click', (e) => {
        if (e.target === compareModal) closeModal();
    });
}

async function uploadFiles(files) {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    formData.append('model_type', modelSelect.value);
    formData.append('scale', scaleSelect.value);

    try {
        const response = await fetch(`${API_BASE}/api/upload`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(await response.text());
        }

        const newTasks = await response.json();
        tasks = [...newTasks, ...tasks];
        renderTasks();
    } catch (error) {
        alert('上传失败: ' + error.message);
    }
}

async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE}/api/tasks`);
        tasks = await response.json();
        renderTasks();
        updateQueueStatus();
    } catch (error) {
        console.error('Failed to load tasks:', error);
    }
}

async function updateQueueStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/status`);
        const status = await response.json();
        document.getElementById('processing-count').textContent = status.processing;
        document.getElementById('queued-count').textContent = status.queued;
        document.getElementById('completed-count').textContent = tasks.filter(t => t.status === 'completed').length;
    } catch (error) {
        console.error('Failed to get status:', error);
    }
}

function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(async () => {
        const hasActiveTasks = tasks.some(t => ['queued', 'processing'].includes(t.status));
        if (hasActiveTasks || tasks.length === 0) {
            await loadTasks();
        }
    }, 2000);
}

function renderTasks() {
    if (tasks.length === 0) {
        tasksContainer.innerHTML = '';
        tasksContainer.appendChild(emptyState);
        emptyState.style.display = 'block';
        batchActions.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    tasksContainer.innerHTML = tasks.map(task => renderTaskCard(task)).join('');

    tasks.forEach(task => {
        const card = document.querySelector(`[data-task-id="${task.task_id}"]`);
        if (!card) return;

        const checkbox = card.querySelector('.task-checkbox');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedTasks.add(task.task_id);
                card.classList.add('selected');
            } else {
                selectedTasks.delete(task.task_id);
                card.classList.remove('selected');
            }
            updateSelectedCount();
        });

        const compareBtn = card.querySelector('.btn-compare');
        if (compareBtn) {
            compareBtn.addEventListener('click', () => openCompareModal(task));
        }

        const downloadBtn = card.querySelector('.btn-download');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => downloadSingle(task));
        }

        const deleteBtn = card.querySelector('.btn-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => deleteTask(task.task_id));
        }

        const compareSlider = card.querySelector('.compare-slider');
        if (compareSlider) {
            initCompareSlider(card, task);
        }
    });

    updateSelectedCount();
    updateQueueStatus();
}

function renderTaskCard(task) {
    const isCompleted = task.status === 'completed';
    const isFailed = task.status === 'failed';
    const isProcessing = task.status === 'processing';
    const isQueued = task.status === 'queued';

    let overlayContent = '';
    if (isQueued) {
        overlayContent = `
            <div class="task-overlay">
                <div class="queue-position">#${task.queue_position}</div>
                <div class="queue-label">队列等待位置</div>
            </div>
        `;
    } else if (isProcessing) {
        const circumference = 2 * Math.PI * 35;
        const offset = circumference - (task.progress / 100) * circumference;
        overlayContent = `
            <div class="task-overlay">
                <svg class="progress-ring" viewBox="0 0 80 80">
                    <circle class="progress-ring-bg" cx="40" cy="40" r="35"/>
                    <circle class="progress-ring-fg" cx="40" cy="40" r="35"
                            style="stroke-dasharray: ${circumference}; stroke-dashoffset: ${offset};"/>
                </svg>
                <div class="progress-text">${task.progress}%</div>
            </div>
        `;
    } else if (isCompleted) {
        overlayContent = `
            <div class="task-overlay" style="opacity: 0; pointer-events: none;">
            </div>
        `;
    }

    const statusBadge = `
        <span class="task-status-badge status-${task.status}">
            ${getStatusText(task.status)}
        </span>
    `;

    const checkbox = `
        <input type="checkbox" class="task-checkbox" 
               ${selectedTasks.has(task.task_id) ? 'checked' : ''}
               ${!isCompleted ? 'disabled' : ''}>
    `;

    const progressBar = !isCompleted && !isFailed ? `
        <div class="task-progress-bar">
            <div class="task-progress-fill" style="width: ${task.progress}%"></div>
        </div>
    ` : '';

    let imageContent = '';
    if (isCompleted) {
        imageContent = `
            <div class="compare-container task-compare">
                <div class="compare-images">
                    <img class="compare-img compare-before" src="${API_BASE}${task.original_url}" alt="原图">
                    <img class="compare-img compare-after" src="${API_BASE}${task.result_url}" alt="超分结果">
                    <div class="compare-slider">
                        <div class="compare-handle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="15 18 9 12 15 6"></polyline>
                                <polyline points="9 18 3 12 9 6"></polyline>
                            </svg>
                        </div>
                    </div>
                    <div class="compare-label before">原图</div>
                    <div class="compare-label after">超分 x${task.scale}</div>
                </div>
            </div>
        `;
    } else if (task.original_url) {
        imageContent = `<img src="${API_BASE}${task.original_url}" alt="${task.filename}">`;
    } else {
        imageContent = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #999;">加载中...</div>';
    }

    const actions = `
        <div class="task-actions">
            <button class="task-action-btn btn-compare" ${!isCompleted ? 'disabled' : ''}>对比</button>
            <button class="task-action-btn btn-download" ${!isCompleted ? 'disabled' : ''}>下载</button>
            <button class="task-action-btn btn-delete">删除</button>
        </div>
    `;

    return `
        <div class="task-card status-${task.status}" data-task-id="${task.task_id}">
            <div class="task-image-container">
                ${checkbox}
                ${statusBadge}
                ${imageContent}
                ${overlayContent}
            </div>
            <div class="task-info">
                <div class="task-filename" title="${task.filename}">${task.filename}</div>
                <div class="task-meta">
                    <span>${task.model_type.toUpperCase()}</span>
                    <span>${task.scale}x 放大</span>
                    ${task.completed_at ? `<span>${formatDuration(task.completed_at - task.created_at)}</span>` : ''}
                </div>
                ${progressBar}
                ${isFailed ? `<div style="color: #dc3545; font-size: 0.85rem; margin-bottom: 10px;">错误: ${task.error}</div>` : ''}
                ${actions}
            </div>
        </div>
    `;
}

function getStatusText(status) {
    const map = {
        queued: '排队中',
        processing: '处理中',
        completed: '已完成',
        failed: '失败'
    };
    return map[status] || status;
}

function formatDuration(seconds) {
    if (seconds < 60) return `${Math.round(seconds)}秒`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}分${Math.round(seconds % 60)}秒`;
    return `${Math.floor(seconds / 3600)}时${Math.floor((seconds % 3600) / 60)}分`;
}

function updateSelectedCount() {
    selectedCountEl.textContent = selectedTasks.size;
    batchActions.style.display = selectedTasks.size > 0 ? 'flex' : 'none';
    downloadSelectedBtn.disabled = selectedTasks.size === 0;
}

async function downloadSelected() {
    if (selectedTasks.size === 0) return;

    try {
        const response = await fetch(`${API_BASE}/api/download/batch`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Array.from(selectedTasks))
        });

        if (!response.ok) throw new Error('下载失败');

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'super_resolution.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        alert('下载失败: ' + error.message);
    }
}

function downloadSingle(task) {
    const a = document.createElement('a');
    a.href = API_BASE + task.result_url;
    const baseName = task.filename.replace(/\.[^/.]+$/, '');
    a.download = `${baseName}_x${task.scale}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

async function deleteTask(taskId) {
    if (!confirm('确定要删除这个任务吗？')) return;

    try {
        const response = await fetch(`${API_BASE}/api/tasks/${taskId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            tasks = tasks.filter(t => t.task_id !== taskId);
            selectedTasks.delete(taskId);
            renderTasks();
        }
    } catch (error) {
        alert('删除失败: ' + error.message);
    }
}

async function clearCompleted() {
    if (!confirm('确定要清除所有已完成和失败的任务吗？')) return;

    try {
        const response = await fetch(`${API_BASE}/api/tasks`, {
            method: 'DELETE'
        });

        if (response.ok) {
            tasks = tasks.filter(t => ['queued', 'processing'].includes(t.status));
            selectedTasks.clear();
            renderTasks();
        }
    } catch (error) {
        alert('清除失败: ' + error.message);
    }
}

function openCompareModal(task) {
    const modal = document.getElementById('compare-modal');
    document.getElementById('modal-title').textContent = `${task.filename} - 前后对比`;
    document.getElementById('compare-before').src = API_BASE + task.original_url;
    document.getElementById('compare-after').src = API_BASE + task.result_url;

    const info = document.getElementById('modal-info');
    info.innerHTML = `
        <p><strong>模型:</strong> ${task.model_type.toUpperCase()}</p>
        <p><strong>放大倍数:</strong> ${task.scale}x</p>
        <p><strong>处理耗时:</strong> ${task.completed_at ? formatDuration(task.completed_at - task.created_at) : '-'}</p>
    `;

    const afterImg = document.querySelector('#compare-container .compare-after');
    const slider = document.querySelector('#compare-container .compare-slider');
    afterImg.style.clipPath = 'inset(0 50% 0 0)';
    slider.style.left = '50%';

    modal.classList.add('active');
    initCompareSlider(document.getElementById('compare-container'), task, true);
}

function closeModal() {
    compareModal.classList.remove('active');
}

function initCompareSlider(container, task, isModal = false) {
    const images = container.querySelector('.compare-images');
    const afterImg = container.querySelector('.compare-after');
    const slider = container.querySelector('.compare-slider');
    if (!images || !afterImg || !slider) return;

    let isDragging = false;

    function updateSlider(e) {
        const rect = images.getBoundingClientRect();
        let x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
        x = Math.max(0, Math.min(x, rect.width));
        const percent = (x / rect.width) * 100;
        afterImg.style.clipPath = `inset(0 ${100 - percent}% 0 0)`;
        slider.style.left = `${percent}%`;
    }

    slider.addEventListener('mousedown', () => isDragging = true);
    slider.addEventListener('touchstart', () => isDragging = true);
    document.addEventListener('mouseup', () => isDragging = false);
    document.addEventListener('touchend', () => isDragging = false);
    document.addEventListener('mousemove', (e) => {
        if (isDragging) updateSlider(e);
    });
    document.addEventListener('touchmove', (e) => {
        if (isDragging) updateSlider(e);
    });
    images.addEventListener('click', updateSlider);

    if (!isModal) {
        const beforeLabel = document.createElement('div');
        beforeLabel.className = 'compare-label before';
        beforeLabel.textContent = '原图';
        images.appendChild(beforeLabel);

        const afterLabel = document.createElement('div');
        afterLabel.className = 'compare-label after';
        afterLabel.textContent = `超分 x${task.scale}`;
        images.appendChild(afterLabel);
    }
}
