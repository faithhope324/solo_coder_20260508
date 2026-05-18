const ChartRenderer = (function() {
    let chartInstance = null;
    const colors = [
        'rgba(59, 130, 246, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(139, 92, 246, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(236, 72, 153, 0.8)',
        'rgba(20, 184, 166, 0.8)',
        'rgba(249, 115, 22, 0.8)',
    ];
    
    const borderColors = [
        'rgba(59, 130, 246, 1)',
        'rgba(16, 185, 129, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(139, 92, 246, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(236, 72, 153, 1)',
        'rgba(20, 184, 166, 1)',
        'rgba(249, 115, 22, 1)',
    ];

    function renderTable(pivotResult) {
        const table = document.getElementById('pivot-table');
        table.innerHTML = '';
        
        if (!pivotResult) return;
        
        const { rowHeaders, colHeaders, data, rowFields, colFields, valueConfigs } = pivotResult;
        
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
        
        const hasRows = rowFields.length > 0;
        const hasCols = colFields.length > 0;
        const hasValues = valueConfigs.length > 0;
        
        if (!hasValues) return;

        if (hasCols) {
            colFields.forEach((field, fieldIdx) => {
                const tr = document.createElement('tr');
                
                if (hasRows) {
                    const emptyTh = document.createElement('th');
                    emptyTh.colSpan = rowFields.length;
                    emptyTh.className = 'row-header';
                    tr.appendChild(emptyTh);
                }
                
                let currentVal = '';
                let spanCount = 0;
                
                colHeaders.forEach((ch, colIdx) => {
                    const val = ch[fieldIdx];
                    if (val !== currentVal) {
                        if (spanCount > 0) {
                            const lastTh = tr.lastChild;
                            if (lastTh) lastTh.colSpan = spanCount * valueConfigs.length;
                        }
                        currentVal = val;
                        spanCount = 1;
                        const th = document.createElement('th');
                        th.textContent = val || '(空)';
                        if (fieldIdx === colFields.length - 1) {
                            th.colSpan = valueConfigs.length;
                        }
                        tr.appendChild(th);
                    } else {
                        spanCount++;
                    }
                });
                
                if (spanCount > 0 && fieldIdx < colFields.length - 1) {
                    const lastTh = tr.lastChild;
                    if (lastTh) lastTh.colSpan = spanCount * valueConfigs.length;
                }
                
                thead.appendChild(tr);
            });
            
            const valueHeaderRow = document.createElement('tr');
            if (hasRows) {
                rowFields.forEach(field => {
                    const th = document.createElement('th');
                    th.textContent = field;
                    th.className = 'row-header';
                    valueHeaderRow.appendChild(th);
                });
            }
            
            colHeaders.forEach(() => {
                valueConfigs.forEach(vc => {
                    const th = document.createElement('th');
                    th.textContent = `${vc.field} (${getAggLabel(vc.aggregation)})`;
                    valueHeaderRow.appendChild(th);
                });
            });
            thead.appendChild(valueHeaderRow);
        } else {
            const tr = document.createElement('tr');
            if (hasRows) {
                rowFields.forEach(field => {
                    const th = document.createElement('th');
                    th.textContent = field;
                    th.className = 'row-header';
                    tr.appendChild(th);
                });
            }
            valueConfigs.forEach(vc => {
                const th = document.createElement('th');
                th.textContent = `${vc.field} (${getAggLabel(vc.aggregation)})`;
                tr.appendChild(th);
            });
            thead.appendChild(tr);
        }
        
        rowHeaders.forEach((rh, rowIdx) => {
            const tr = document.createElement('tr');
            
            if (hasRows) {
                rh.forEach((val, idx) => {
                    const td = document.createElement('td');
                    td.textContent = val || '(空)';
                    td.className = 'row-header';
                    tr.appendChild(td);
                });
            }
            
            data[rowIdx].forEach(cell => {
                if (Array.isArray(cell)) {
                    cell.forEach(val => {
                        const td = document.createElement('td');
                        td.textContent = Aggregator.formatNumberFull(val);
                        tr.appendChild(td);
                    });
                } else {
                    const td = document.createElement('td');
                    td.textContent = Aggregator.formatNumberFull(cell);
                    tr.appendChild(td);
                }
            });
            
            tbody.appendChild(tr);
        });
        
        table.appendChild(thead);
        table.appendChild(tbody);
    }

    function renderChart(pivotResult) {
        const ctx = document.getElementById('pivot-chart');
        
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        
        if (!pivotResult) return;
        
        const { rowHeaders, colHeaders, data, rowFields, colFields, valueConfigs } = pivotResult;
        
        const hasRows = rowFields.length > 0;
        const hasCols = colFields.length > 0;
        const hasValues = valueConfigs.length > 0;
        
        if (!hasValues) return;

        let labels = [];
        let datasets = [];

        if (hasRows) {
            labels = rowHeaders.map(rh => rh.join(' - '));
        } else {
            labels = colHeaders.map(ch => ch.join(' - '));
        }

        if (hasRows && hasCols) {
            colHeaders.forEach((ch, colIdx) => {
                valueConfigs.forEach((vc, vcIdx) => {
                    const colorIdx = (colIdx * valueConfigs.length + vcIdx) % colors.length;
                    const dataValues = data.map(row => {
                        const cell = row[colIdx];
                        if (Array.isArray(cell)) {
                            return cell[vcIdx] ?? 0;
                        }
                        return cell ?? 0;
                    });
                    
                    datasets.push({
                        label: `${ch.join(' - ')} - ${vc.field}`,
                        data: dataValues,
                        backgroundColor: colors[colorIdx],
                        borderColor: borderColors[colorIdx],
                        borderWidth: 1,
                        borderRadius: 4,
                    });
                });
            });
        } else if (hasRows) {
            valueConfigs.forEach((vc, vcIdx) => {
                const colorIdx = vcIdx % colors.length;
                const dataValues = data.map(row => {
                    const cell = row[0];
                    if (Array.isArray(cell)) {
                        return cell[vcIdx] ?? 0;
                    }
                    return cell ?? 0;
                });
                
                datasets.push({
                    label: `${vc.field} (${getAggLabel(vc.aggregation)})`,
                    data: dataValues,
                    backgroundColor: colors[colorIdx],
                    borderColor: borderColors[colorIdx],
                    borderWidth: 1,
                    borderRadius: 4,
                });
            });
        } else if (hasCols) {
            valueConfigs.forEach((vc, vcIdx) => {
                const colorIdx = vcIdx % colors.length;
                const dataValues = data[0].map(cell => {
                    if (Array.isArray(cell)) {
                        return cell[vcIdx] ?? 0;
                    }
                    return cell ?? 0;
                });
                
                datasets.push({
                    label: `${vc.field} (${getAggLabel(vc.aggregation)})`,
                    data: dataValues,
                    backgroundColor: colors[colorIdx],
                    borderColor: borderColors[colorIdx],
                    borderWidth: 1,
                    borderRadius: 4,
                });
            });
        }

        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                family: 'Inter',
                                size: 12
                            },
                            padding: 15,
                            usePointStyle: true,
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleFont: {
                            family: 'Inter',
                            size: 13
                        },
                        bodyFont: {
                            family: 'Inter',
                            size: 12
                        },
                        padding: 12,
                        cornerRadius: 8,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += Aggregator.formatNumberFull(context.parsed.y);
                                }
                                return label;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 11
                            },
                            maxRotation: 45,
                            minRotation: 0
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(148, 163, 184, 0.2)'
                        },
                        ticks: {
                            font: {
                                family: 'Inter',
                                size: 11
                            },
                            callback: function(value) {
                                if (typeof value === 'number') {
                                    return value.toLocaleString();
                                }
                                return value;
                            }
                        }
                    }
                },
                animation: {
                    duration: 500
                }
            }
        });
    }

    function getAggLabel(agg) {
        switch (agg) {
            case 'sum': return '求和';
            case 'count': return '计数';
            case 'average': return '平均';
            default: return agg;
        }
    }

    function destroyChart() {
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
    }

    return {
        renderTable,
        renderChart,
        destroyChart
    };
})();
