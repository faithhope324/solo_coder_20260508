class TimeSeriesForecaster {
    constructor() {
        this.fileId = null;
        this.lastResult = null;
        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.fileInfo = document.getElementById('fileInfo');
        this.fileName = document.getElementById('fileName');
        this.fileMeta = document.getElementById('fileMeta');
        this.previewTable = document.getElementById('previewTable');
        this.previewDataTable = document.getElementById('previewDataTable');
        this.modelSelect = document.getElementById('modelSelect');
        this.periodsInput = document.getElementById('periodsInput');
        this.arimaParams = document.getElementById('arimaParams');
        this.autoParams = document.getElementById('autoParams');
        this.manualParams = document.getElementById('manualParams');
        this.paramP = document.getElementById('paramP');
        this.paramD = document.getElementById('paramD');
        this.paramQ = document.getElementById('paramQ');
        this.paramPValue = document.getElementById('paramPValue');
        this.paramDValue = document.getElementById('paramDValue');
        this.paramQValue = document.getElementById('paramQValue');
        this.predictBtn = document.getElementById('predictBtn');
        this.resultCard = document.getElementById('resultCard');
        this.modelInfo = document.getElementById('modelInfo');
        this.metricsGrid = document.getElementById('metricsGrid');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.chartPlaceholder = document.getElementById('chartPlaceholder');
        this.chart = document.getElementById('chart');
        this.forecastTableCard = document.getElementById('forecastTableCard');
        this.forecastTableBody = document.getElementById('forecastTableBody');
        this.toast = document.getElementById('toast');
    }

    initEventListeners() {
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', () => this.handleDragLeave());
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        this.modelSelect.addEventListener('change', () => this.handleModelChange());
        this.autoParams.addEventListener('change', () => this.handleAutoParamsChange());
        
        this.paramP.addEventListener('input', () => this.updateSliderValue(this.paramP, this.paramPValue));
        this.paramD.addEventListener('input', () => this.updateSliderValue(this.paramD, this.paramDValue));
        this.paramQ.addEventListener('input', () => this.updateSliderValue(this.paramQ, this.paramQValue));
        
        this.predictBtn.addEventListener('click', () => this.handlePredict());
        this.downloadBtn.addEventListener('click', () => this.handleDownload());
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave() {
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.uploadFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.uploadFile(file);
        }
    }

    async uploadFile(file) {
        if (!file.name.endsWith('.csv')) {
            this.showToast('请上传CSV文件', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        try {
            this.showToast('正在上传文件...', 'info');
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                this.fileId = data.file_id;
                this.fileName.textContent = data.filename;
                this.fileMeta.textContent = `共 ${data.row_count} 条数据`;
                this.fileInfo.style.display = 'block';
                this.renderPreviewTable(data.preview);
                this.predictBtn.disabled = false;
                this.showToast('文件上传成功', 'success');
            } else {
                this.showToast(data.error || '上传失败', 'error');
            }
        } catch (error) {
            this.showToast('上传失败: ' + error.message, 'error');
        }
    }

    renderPreviewTable(previewData) {
        if (!previewData || previewData.length === 0) {
            this.previewTable.style.display = 'none';
            return;
        }

        let html = '<thead><tr>';
        Object.keys(previewData[0]).forEach(key => {
            html += `<th>${key}</th>`;
        });
        html += '</tr></thead><tbody>';

        previewData.forEach(row => {
            html += '<tr>';
            Object.values(row).forEach(value => {
                html += `<td>${value}</td>`;
            });
            html += '</tr>';
        });
        html += '</tbody>';

        this.previewDataTable.innerHTML = html;
        this.previewTable.style.display = 'block';
    }

    handleModelChange() {
        if (this.modelSelect.value === 'arima') {
            this.arimaParams.style.display = 'block';
        } else {
            this.arimaParams.style.display = 'none';
        }
    }

    handleAutoParamsChange() {
        if (this.autoParams.checked) {
            this.manualParams.style.display = 'none';
        } else {
            this.manualParams.style.display = 'block';
        }
    }

    updateSliderValue(slider, valueElement) {
        valueElement.textContent = slider.value;
    }

    async handlePredict() {
        if (!this.fileId) {
            this.showToast('请先上传数据文件', 'error');
            return;
        }

        const periods = parseInt(this.periodsInput.value);
        if (isNaN(periods) || periods < 1 || periods > 1000) {
            this.showToast('请输入有效的预测步数 (1-1000)', 'error');
            return;
        }

        const model = this.modelSelect.value;
        const arimaParams = {
            auto: this.autoParams.checked,
            p: parseInt(this.paramP.value),
            d: parseInt(this.paramD.value),
            q: parseInt(this.paramQ.value)
        };

        this.predictBtn.classList.add('loading');
        this.predictBtn.disabled = true;
        this.showToast('正在进行预测，请稍候...', 'info');

        try {
            const response = await fetch('/api/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file_id: this.fileId,
                    model: model,
                    periods: periods,
                    arima_params: arimaParams
                })
            });

            const data = await response.json();

            if (data.success) {
                this.lastResult = data;
                this.renderChart(data);
                this.renderModelInfo(data);
                this.renderMetrics(data);
                this.renderForecastTable(data);
                this.resultCard.style.display = 'block';
                this.forecastTableCard.style.display = 'block';
                this.chartPlaceholder.style.display = 'none';
                this.chart.style.display = 'block';
                this.showToast('预测完成', 'success');
            } else {
                this.showToast(data.error || '预测失败', 'error');
            }
        } catch (error) {
            this.showToast('预测失败: ' + error.message, 'error');
        } finally {
            this.predictBtn.classList.remove('loading');
            this.predictBtn.disabled = false;
        }
    }

    renderChart(data) {
        const historicalDates = data.historical.dates;
        const historicalValues = data.historical.values;
        const forecastDates = data.forecast.dates;
        const forecastValues = data.forecast.values;
        const lowerValues = data.forecast.lower;
        const upperValues = data.forecast.upper;

        const lastHistoricalDate = historicalDates[historicalDates.length - 1];
        const extendedDates = [...historicalDates, ...forecastDates];

        const traceHistorical = {
            x: historicalDates,
            y: historicalValues,
            mode: 'lines',
            name: '历史数据',
            line: {
                color: '#1e3a5f',
                width: 2
            }
        };

        const traceForecast = {
            x: forecastDates,
            y: forecastValues,
            mode: 'lines',
            name: '预测值',
            line: {
                color: '#00d4aa',
                width: 3
            }
        };

        const traceUpper = {
            x: forecastDates,
            y: upperValues,
            mode: 'lines',
            name: '置信区间上限',
            line: {
                color: 'rgba(0, 212, 170, 0.3)',
                width: 1,
                dash: 'dash'
            },
            showlegend: false
        };

        const traceLower = {
            x: forecastDates,
            y: lowerValues,
            mode: 'lines',
            name: '置信区间下限',
            fill: 'tonexty',
            fillcolor: 'rgba(0, 212, 170, 0.15)',
            line: {
                color: 'rgba(0, 212, 170, 0.3)',
                width: 1,
                dash: 'dash'
            }
        };

        const traceConnect = {
            x: [lastHistoricalDate, forecastDates[0]],
            y: [historicalValues[historicalValues.length - 1], forecastValues[0]],
            mode: 'lines',
            name: '',
            line: {
                color: '#00d4aa',
                width: 3
            },
            showlegend: false
        };

        const plotData = [traceHistorical, traceConnect, traceForecast, traceUpper, traceLower];

        const layout = {
            title: {
                text: '时间序列预测结果',
                font: {
                    family: 'Arial, sans-serif',
                    size: 18,
                    color: '#1e3a5f'
                },
                x: 0.5,
                xanchor: 'center'
            },
            xaxis: {
                title: '日期',
                showgrid: true,
                gridcolor: '#e2e8f0',
                tickfont: { size: 11 },
                rangeslider: {
                    visible: true
                }
            },
            yaxis: {
                title: '数值',
                showgrid: true,
                gridcolor: '#e2e8f0',
                tickfont: { size: 11 }
            },
            legend: {
                orientation: 'h',
                y: -0.15,
                x: 0.5,
                xanchor: 'center',
                font: { size: 12 }
            },
            margin: {
                l: 60,
                r: 40,
                t: 80,
                b: 80
            },
            hovermode: 'x unified',
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
        };

        const config = {
            responsive: true,
            displayModeBar: true,
            modeBarButtonsToRemove: ['lasso2d', 'select2d'],
            displaylogo: false
        };

        Plotly.newPlot('chart', plotData, layout, config);
    }

    renderModelInfo(data) {
        const info = data.model_info;
        let html = '<p><strong>模型:</strong> ' + info.model + '</p>';
        
        if (info.model === 'ARIMA') {
            html += '<p><strong>参数 (p,d,q):</strong> (' + 
                info.parameters.p + ', ' + 
                info.parameters.d + ', ' + 
                info.parameters.q + ')</p>';
            if (info.aic !== null && info.aic !== undefined) {
                html += '<p><strong>AIC:</strong> ' + info.aic + '</p>';
            }
        } else {
            html += '<p><strong>年度季节性:</strong> ' + (info.parameters.yearly_seasonality ? '启用' : '禁用') + '</p>';
            html += '<p><strong>周度季节性:</strong> ' + (info.parameters.weekly_seasonality ? '启用' : '禁用') + '</p>';
        }
        
        this.modelInfo.innerHTML = html;
    }

    renderMetrics(data) {
        const metrics = data.metrics;
        const html = `
            <div class="metric-card">
                <div class="metric-label">RMSE</div>
                <div class="metric-value">${metrics.rmse}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">MAE</div>
                <div class="metric-value">${metrics.mae}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label">MAPE (%)</div>
                <div class="metric-value">${metrics.mape}</div>
            </div>
        `;
        this.metricsGrid.innerHTML = html;
    }

    renderForecastTable(data) {
        const forecast = data.forecast;
        let html = '';
        
        const displayCount = Math.min(forecast.dates.length, 50);
        
        for (let i = 0; i < displayCount; i++) {
            html += `
                <tr>
                    <td>${forecast.dates[i]}</td>
                    <td>${forecast.values[i]}</td>
                    <td>${forecast.lower[i]}</td>
                    <td>${forecast.upper[i]}</td>
                </tr>
            `;
        }
        
        if (forecast.dates.length > 50) {
            html += `<tr><td colspan="4" style="text-align: center; color: #718096;">... 还有 ${forecast.dates.length - 50} 条预测数据</td></tr>`;
        }
        
        this.forecastTableBody.innerHTML = html;
    }

    async handleDownload() {
        if (!this.fileId) {
            this.showToast('请先执行预测', 'error');
            return;
        }

        try {
            const response = await fetch('/api/download', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file_id: this.fileId
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'forecast_result.csv';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                this.showToast('下载成功', 'success');
            } else {
                const data = await response.json();
                this.showToast(data.error || '下载失败', 'error');
            }
        } catch (error) {
            this.showToast('下载失败: ' + error.message, 'error');
        }
    }

    showToast(message, type = 'info') {
        this.toast.textContent = message;
        this.toast.className = 'toast ' + type + ' show';
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TimeSeriesForecaster();
});
