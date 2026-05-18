const API_BASE = '/api';

let currentIntersection = '';
let historicalData = [];
let predictionData = [];

const elements = {
    fileInput: document.getElementById('fileInput'),
    uploadStatus: document.getElementById('uploadStatus'),
    dataInfo: document.getElementById('dataInfo'),
    fileName: document.getElementById('fileName'),
    totalRecords: document.getElementById('totalRecords'),
    dateRange: document.getElementById('dateRange'),
    intersectionCount: document.getElementById('intersectionCount'),
    intersectionSelect: document.getElementById('intersectionSelect'),
    timeSelect: document.getElementById('timeSelect'),
    predictionHours: document.getElementById('predictionHours'),
    predictBtn: document.getElementById('predictBtn'),
    predictionResult: document.getElementById('predictionResult'),
    resultIntersection: document.getElementById('resultIntersection'),
    resultTime: document.getElementById('resultTime'),
    resultTraffic: document.getElementById('resultTraffic'),
    historyHours: document.getElementById('historyHours'),
    chartContainer: document.getElementById('chartContainer'),
    modelInfo: document.getElementById('modelInfo')
};

elements.fileInput.addEventListener('change', handleFileUpload);
elements.intersectionSelect.addEventListener('change', handleIntersectionChange);
elements.predictBtn.addEventListener('click', handlePredict);
elements.historyHours.addEventListener('change', loadHistoricalData);

async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    elements.uploadStatus.textContent = '正在上传...';
    elements.uploadStatus.className = 'upload-status';
    try {
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });
        let data;
        try {
            data = await response.json();
        } catch (parseError) {
            const text = await response.text();
            console.error('服务器返回非JSON:', text.substring(0, 200));
            throw new Error('服务器响应格式错误');
        }
        if (data.success) {
            elements.uploadStatus.textContent = '✓ 上传成功！';
            elements.uploadStatus.className = 'upload-status success';
            showDataInfo(data);
            populateIntersections(data.intersections);
        } else {
            elements.uploadStatus.textContent = '✗ 上传失败: ' + (data.error || '未知错误');
            elements.uploadStatus.className = 'upload-status error';
        }
    } catch (error) {
        elements.uploadStatus.textContent = '✗ 上传失败: ' + error.message;
        elements.uploadStatus.className = 'upload-status error';
    }
}

function showDataInfo(data) {
    elements.fileName.textContent = data.filename;
    elements.totalRecords.textContent = data.total_records;
    elements.dateRange.textContent = `${data.date_range.start} ~ ${data.date_range.end}`;
    elements.intersectionCount.textContent = data.intersections.length;
    elements.dataInfo.style.display = 'block';
}

function populateIntersections(intersections) {
    elements.intersectionSelect.innerHTML = '<option value="">请选择路口</option>';
    intersections.forEach(id => {
        const option = document.createElement('option');
        option.value = id;
        option.textContent = id;
        elements.intersectionSelect.appendChild(option);
    });
    elements.intersectionSelect.disabled = false;
}

async function handleIntersectionChange(e) {
    currentIntersection = e.target.value;
    if (!currentIntersection) {
        elements.timeSelect.disabled = true;
        elements.predictionHours.disabled = true;
        elements.predictBtn.disabled = true;
        return;
    }
    await loadAvailableTimes();
    await loadHistoricalData();
    await loadModelInfo();
    elements.predictionHours.disabled = false;
    elements.predictBtn.disabled = false;
}

async function loadAvailableTimes() {
    try {
        const response = await fetch(`${API_BASE}/available_times?intersection_id=${currentIntersection}`);
        const data = await response.json();
        if (data.success) {
            elements.timeSelect.innerHTML = '<option value="">请选择预测时间</option>';
            data.available_times.slice(-48).forEach(time => {
                const option = document.createElement('option');
                option.value = time;
                option.textContent = time;
                elements.timeSelect.appendChild(option);
            });
            if (data.available_times.length > 0) {
                elements.timeSelect.value = data.available_times[data.available_times.length - 1];
            }
            elements.timeSelect.disabled = false;
        }
    } catch (error) {
        console.error('加载时间失败:', error);
    }
}

async function loadHistoricalData() {
    const hours = elements.historyHours.value;
    try {
        const response = await fetch(`${API_BASE}/historical?intersection_id=${currentIntersection}&hours=${hours}`);
        const data = await response.json();
        if (data.success) {
            historicalData = data.historical_data;
            renderChart();
        }
    } catch (error) {
        console.error('加载历史数据失败:', error);
    }
}

async function loadModelInfo() {
    try {
        const response = await fetch(`${API_BASE}/model_info?intersection_id=${currentIntersection}`);
        const data = await response.json();
        if (data.success) {
            showModelInfo(data.model_info);
        } else {
            elements.modelInfo.innerHTML = '<p class="no-model">未找到该路口的模型信息</p>';
        }
    } catch (error) {
        elements.modelInfo.innerHTML = '<p class="no-model">加载模型信息失败</p>';
    }
}

function showModelInfo(info) {
    const hyperparams = info.hyperparams || {};
    const training = info.training_history || {};
    const html = `
        <table>
            <tr><td>路口ID</td><td>${info.intersection_id}</td></tr>
            <tr><td>模型训练时间</td><td>${info.timestamp || '未知'}</td></tr>
            <tr><td>隐藏层大小</td><td>${hyperparams.hidden_size || '-'}</td></tr>
            <tr><td>LSTM层数</td><td>${hyperparams.num_layers || '-'}</td></tr>
            <tr><td>Dropout</td><td>${hyperparams.dropout || '-'}</td></tr>
            <tr><td>序列长度</td><td>${hyperparams.seq_length || '-'}</td></tr>
            <tr><td>批次大小</td><td>${hyperparams.batch_size || '-'}</td></tr>
            <tr><td>学习率</td><td>${hyperparams.learning_rate || '-'}</td></tr>
            <tr><td>训练轮数</td><td>${training.epochs || training.epochs_trained || '-'}</td></tr>
            <tr><td>最佳验证损失</td><td>${training.best_val_loss ? training.best_val_loss.toFixed(6) : '-'}</td></tr>
        </table>
    `;
    elements.modelInfo.innerHTML = html;
}

async function handlePredict() {
    const targetTime = elements.timeSelect.value;
    const hours = parseInt(elements.predictionHours.value) || 1;
    if (!currentIntersection || !targetTime) {
        alert('请选择路口和预测时间');
        return;
    }
    elements.predictBtn.disabled = true;
    elements.predictBtn.textContent = '预测中...';
    try {
        let prediction;
        if (hours > 1) {
            const response = await fetch(`${API_BASE}/predict_range`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    intersection_id: currentIntersection,
                    start_time: targetTime,
                    hours: hours
                })
            });
            const data = await response.json();
            if (data.success) {
                predictionData = data.predictions.predictions;
                showPredictionResult(predictionData[0]);
            } else {
                throw new Error(data.error);
            }
        } else {
            const response = await fetch(`${API_BASE}/predict`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    intersection_id: currentIntersection,
                    target_time: targetTime
                })
            });
            const data = await response.json();
            if (data.success) {
                predictionData = [data.prediction];
                showPredictionResult(data.prediction);
            } else {
                throw new Error(data.error);
            }
        }
        renderChart();
    } catch (error) {
        alert('预测失败: ' + error.message);
    } finally {
        elements.predictBtn.disabled = false;
        elements.predictBtn.textContent = '开始预测';
    }
}

function showPredictionResult(pred) {
    elements.resultIntersection.textContent = pred.intersection_id;
    elements.resultTime.textContent = pred.prediction_time;
    elements.resultTraffic.textContent = pred.predicted_traffic + ' 辆';
    elements.predictionResult.style.display = 'block';
}

function renderChart() {
    const traces = [];
    if (historicalData.length > 0) {
        traces.push({
            x: historicalData.map(d => d.timestamp),
            y: historicalData.map(d => d.traffic_volume),
            type: 'scatter',
            mode: 'lines',
            name: '历史流量',
            line: { color: '#667eea', width: 2 }
        });
    }
    if (predictionData.length > 0) {
        traces.push({
            x: predictionData.map(d => d.prediction_time),
            y: predictionData.map(d => d.predicted_traffic),
            type: 'scatter',
            mode: 'markers+lines',
            name: '预测流量',
            line: { color: '#f56565', width: 2, dash: 'dashdot' },
            marker: { size: 8, symbol: 'circle' }
        });
    }
    const layout = {
        margin: { l: 50, r: 20, t: 20, b: 50 },
        legend: { orientation: 'h', y: -0.2 },
        xaxis: {
            title: '时间',
            tickangle: -45,
            tickfont: { size: 10 }
        },
        yaxis: {
            title: '车流量（辆/小时）'
        },
        hovermode: 'x unified'
    };
    const config = {
        responsive: true,
        displayModeBar: true,
        displaylogo: false
    };
    Plotly.newPlot(elements.chartContainer, traces, layout, config);
}

async function init() {
    renderChart();
    try {
        const response = await fetch(`${API_BASE}/data_status`);
        const data = await response.json();
        if (data.success && data.has_data) {
            showDataInfo(data);
            populateIntersections(data.intersections);
        }
    } catch (error) {
        console.log('暂无已加载数据');
    }
}

init();
