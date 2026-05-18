const App = (function() {
    let currentData = null;
    let pivotConfig = {
        rows: [],
        columns: [],
        values: []
    };
    let currentAggregation = 'sum';
    let currentView = 'table';

    function init() {
        setupFileUpload();
        setupDragDrop();
        setupChartTypeToggle();
        setupAggregationButtons();
    }

    function setupFileUpload() {
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const browseBtn = document.getElementById('browse-btn');
        const removeFileBtn = document.getElementById('remove-file');
        const fileInfo = document.getElementById('file-info');
        const fileName = document.getElementById('file-name');

        browseBtn.addEventListener('click', () => {
            fileInput.click();
        });

        dropZone.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            if (e.target === dropZone || e.target.tagName === 'H3' || e.target.tagName === 'P' || e.target.tagName === 'DIV') {
                fileInput.click();
            }
        });

        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                handleFile(file);
            }
        });

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('border-blue-500', 'bg-blue-50/80');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500', 'bg-blue-50/80');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('border-blue-500', 'bg-blue-50/80');
            
            const file = e.dataTransfer.files[0];
            if (file && file.name.endsWith('.csv')) {
                handleFile(file);
            } else {
                alert('请上传 CSV 格式的文件');
            }
        });

        removeFileBtn.addEventListener('click', () => {
            resetApp();
        });
    }

    async function handleFile(file) {
        try {
            const dropZone = document.getElementById('drop-zone');
            dropZone.innerHTML = `
                <div class="loading"></div>
                <p class="mt-4 text-slate-600">正在解析文件...</p>
            `;

            const data = await CSVParser.parseFile(file);
            currentData = data;
            
            document.getElementById('file-name').textContent = `${file.name} (${file.size.toLocaleString()} bytes, ${data.rows.length} 行)`;
            document.getElementById('file-info').classList.remove('hidden');
            document.getElementById('drop-zone').classList.add('hidden');
            document.getElementById('main-content').classList.remove('hidden');
            
            renderDataPreview(data);
            renderFieldList(data);
            resetPivotConfig();
            
        } catch (error) {
            console.error('文件解析失败:', error);
            alert('文件解析失败: ' + error.message);
            resetUploadZone();
        }
    }

    function renderDataPreview(data) {
        const { headers, rows } = data;
        const previewHeader = document.getElementById('preview-header');
        const previewBody = document.getElementById('preview-body');
        
        previewHeader.innerHTML = '';
        previewBody.innerHTML = '';
        
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            th.className = 'px-4 py-2 text-left whitespace-nowrap';
            headerRow.appendChild(th);
        });
        previewHeader.appendChild(headerRow);
        
        const displayRows = rows.slice(0, 50);
        displayRows.forEach(row => {
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-slate-50';
            headers.forEach(header => {
                const td = document.createElement('td');
                const val = row[header];
                td.textContent = val !== null && val !== undefined ? String(val) : '';
                td.className = 'px-4 py-2 border-b border-slate-100 whitespace-nowrap';
                tr.appendChild(td);
            });
            previewBody.appendChild(tr);
        });
        
        document.getElementById('data-stats').textContent = 
            `共 ${rows.length} 行数据，${headers.length} 个字段。显示前 ${displayRows.length} 行预览。`;
    }

    function renderFieldList(data) {
        const fieldList = document.getElementById('field-list');
        fieldList.innerHTML = '';
        
        data.headers.forEach(header => {
            const type = data.columnTypes[header];
            const fieldItem = DragDrop.createFieldItem(header, type);
            fieldList.appendChild(fieldItem);
        });
    }

    function setupDragDrop() {
        DragDrop.init({
            onFieldDrop: (field, type, zone) => {
                addFieldToZone(field, zone);
            },
            onFieldRemove: (field, zone) => {
                removeFieldFromZone(field, zone);
            }
        });
    }

    function addFieldToZone(field, zone) {
        if (zone === 'values') {
            if (currentData.columnTypes[field] !== 'number') {
                const confirmed = confirm(`字段 "${field}" 不是数值类型，可能无法正确计算。是否继续？`);
                if (!confirmed) return;
            }
            
            const existing = pivotConfig.values.find(v => v.field === field);
            if (!existing) {
                pivotConfig.values.push({
                    field: field,
                    aggregation: currentAggregation
                });
            }
        } else {
            const targetArray = zone === 'rows' ? pivotConfig.rows : pivotConfig.columns;
            if (!targetArray.includes(field)) {
                targetArray.push(field);
            }
        }
        
        updateZonesDisplay();
        updatePivotResult();
    }

    function removeFieldFromZone(field, zone) {
        if (zone === 'values') {
            pivotConfig.values = pivotConfig.values.filter(v => v.field !== field);
        } else {
            const targetArray = zone === 'rows' ? pivotConfig.rows : pivotConfig.columns;
            const idx = targetArray.indexOf(field);
            if (idx > -1) {
                targetArray.splice(idx, 1);
            }
        }
        
        updateZonesDisplay();
        updatePivotResult();
    }

    function updateZonesDisplay() {
        DragDrop.renderZoneFields('rows', pivotConfig.rows, currentData.columnTypes);
        DragDrop.renderZoneFields('columns', pivotConfig.columns, currentData.columnTypes);
        DragDrop.renderZoneFields('values', pivotConfig.values.map(v => v.field), currentData.columnTypes);
        
        const aggOptions = document.getElementById('aggregation-options');
        if (pivotConfig.values.length > 0) {
            aggOptions.classList.remove('hidden');
        } else {
            aggOptions.classList.add('hidden');
        }
    }

    function resetPivotConfig() {
        pivotConfig = {
            rows: [],
            columns: [],
            values: []
        };
        currentAggregation = 'sum';
        currentView = 'table';
        
        updateZonesDisplay();
        updateAggregationButtons();
        updateChartTypeButtons();
        updatePivotResult();
    }

    function updatePivotResult() {
        const emptyState = document.getElementById('empty-state');
        const tableContainer = document.getElementById('table-container');
        const chartContainer = document.getElementById('chart-container');
        
        const hasConfig = (pivotConfig.rows.length > 0 || pivotConfig.columns.length > 0) && pivotConfig.values.length > 0;
        
        if (!hasConfig) {
            emptyState.classList.remove('hidden');
            tableContainer.classList.add('hidden');
            chartContainer.classList.add('hidden');
            ChartRenderer.destroyChart();
            return;
        }
        
        emptyState.classList.add('hidden');
        
        const pivotResult = Aggregator.calculatePivot(currentData.rows, pivotConfig);
        
        if (currentView === 'table') {
            tableContainer.classList.remove('hidden');
            chartContainer.classList.add('hidden');
            ChartRenderer.destroyChart();
            ChartRenderer.renderTable(pivotResult);
        } else {
            tableContainer.classList.add('hidden');
            chartContainer.classList.remove('hidden');
            ChartRenderer.renderChart(pivotResult);
        }
    }

    function setupChartTypeToggle() {
        const tableViewBtn = document.getElementById('table-view-btn');
        const chartViewBtn = document.getElementById('chart-view-btn');
        
        tableViewBtn.addEventListener('click', () => {
            currentView = 'table';
            updateChartTypeButtons();
            updatePivotResult();
        });
        
        chartViewBtn.addEventListener('click', () => {
            currentView = 'chart';
            updateChartTypeButtons();
            updatePivotResult();
        });
    }

    function updateChartTypeButtons() {
        const tableViewBtn = document.getElementById('table-view-btn');
        const chartViewBtn = document.getElementById('chart-view-btn');
        
        if (currentView === 'table') {
            tableViewBtn.classList.add('bg-blue-600', 'text-white');
            tableViewBtn.classList.remove('bg-slate-200', 'text-slate-700');
            chartViewBtn.classList.remove('bg-blue-600', 'text-white');
            chartViewBtn.classList.add('bg-slate-200', 'text-slate-700');
        } else {
            chartViewBtn.classList.add('bg-blue-600', 'text-white');
            chartViewBtn.classList.remove('bg-slate-200', 'text-slate-700');
            tableViewBtn.classList.remove('bg-blue-600', 'text-white');
            tableViewBtn.classList.add('bg-slate-200', 'text-slate-700');
        }
    }

    function setupAggregationButtons() {
        const aggBtns = document.querySelectorAll('.agg-btn');
        
        aggBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                currentAggregation = btn.dataset.agg;
                updateAggregationButtons();
                
                pivotConfig.values = pivotConfig.values.map(v => ({
                    ...v,
                    aggregation: currentAggregation
                }));
                
                updatePivotResult();
            });
        });
    }

    function updateAggregationButtons() {
        const aggBtns = document.querySelectorAll('.agg-btn');
        
        aggBtns.forEach(btn => {
            if (btn.dataset.agg === currentAggregation) {
                btn.classList.add('bg-blue-600', 'text-white');
                btn.classList.remove('bg-slate-200', 'text-slate-700');
            } else {
                btn.classList.remove('bg-blue-600', 'text-white');
                btn.classList.add('bg-slate-200', 'text-slate-700');
            }
        });
    }

    function resetApp() {
        currentData = null;
        resetPivotConfig();
        
        document.getElementById('file-info').classList.add('hidden');
        document.getElementById('main-content').classList.add('hidden');
        document.getElementById('file-input').value = '';
        
        resetUploadZone();
    }

    function resetUploadZone() {
        const dropZone = document.getElementById('drop-zone');
        dropZone.classList.remove('hidden');
        dropZone.innerHTML = `
            <div class="text-6xl mb-4">📁</div>
            <h3 class="text-xl font-semibold text-slate-700 mb-2">拖拽 CSV 文件到这里</h3>
            <p class="text-slate-500 mb-4">或点击选择文件</p>
            <button id="browse-btn" class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                选择文件
            </button>
        `;
        setupFileUpload();
    }

    return {
        init
    };
})();

document.addEventListener('DOMContentLoaded', function() {
    App.init();
});
