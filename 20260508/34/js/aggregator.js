const Aggregator = (function() {
    function calculatePivot(data, config) {
        const { rows: rowFields, columns: colFields, values: valueConfigs } = config;
        
        if (rowFields.length === 0 && colFields.length === 0) {
            return null;
        }

        const rowValues = getCombinations(data, rowFields);
        const colValues = getCombinations(data, colFields);

        const resultMatrix = {};
        
        data.forEach(row => {
            const rowKey = rowFields.map(f => String(row[f] || '')).join('|||');
            const colKey = colFields.map(f => String(row[f] || '')).join('|||');
            
            if (!resultMatrix[rowKey]) {
                resultMatrix[rowKey] = {};
            }
            if (!resultMatrix[rowKey][colKey]) {
                resultMatrix[rowKey][colKey] = {};
            }
            
            valueConfigs.forEach(vc => {
                if (!resultMatrix[rowKey][colKey][vc.field]) {
                    resultMatrix[rowKey][colKey][vc.field] = { sum: 0, count: 0, values: [] };
                }
                const cell = resultMatrix[rowKey][colKey][vc.field];
                const numVal = CSVParser.toNumber(row[vc.field]);
                if (numVal !== null) {
                    cell.sum += numVal;
                    cell.count++;
                    cell.values.push(numVal);
                }
            });
        });

        const pivotData = [];
        rowValues.forEach(rv => {
            const rowKey = rv.join('|||');
            const rowData = [];
            
            colValues.forEach(cv => {
                const colKey = cv.join('|||');
                const cellData = [];
                
                valueConfigs.forEach(vc => {
                    const cell = resultMatrix[rowKey]?.[colKey]?.[vc.field];
                    if (cell) {
                        let value;
                        switch (vc.aggregation) {
                            case 'sum':
                                value = cell.sum;
                                break;
                            case 'count':
                                value = cell.count;
                                break;
                            case 'average':
                                value = cell.count > 0 ? cell.sum / cell.count : null;
                                break;
                            default:
                                value = cell.sum;
                        }
                        cellData.push(value);
                    } else {
                        cellData.push(null);
                    }
                });
                
                rowData.push(cellData.length === 1 ? cellData[0] : cellData);
            });
            
            pivotData.push(rowData);
        });

        return {
            rowHeaders: rowValues,
            colHeaders: colValues,
            data: pivotData,
            rowFields: rowFields,
            colFields: colFields,
            valueConfigs: valueConfigs
        };
    }

    function getCombinations(data, fields) {
        if (fields.length === 0) {
            return [[]];
        }
        
        const combinations = new Set();
        
        data.forEach(row => {
            const key = fields.map(f => String(row[f] || '')).join('|||');
            combinations.add(key);
        });
        
        return Array.from(combinations)
            .sort()
            .map(key => key.split('|||'));
    }

    function formatNumber(num) {
        if (num === null || num === undefined) return '-';
        if (typeof num !== 'number') return String(num);
        
        if (Math.abs(num) >= 1000000) {
            return (num / 1000000).toFixed(2) + 'M';
        } else if (Math.abs(num) >= 1000) {
            return (num / 1000).toFixed(2) + 'K';
        } else if (Number.isInteger(num)) {
            return num.toString();
        } else {
            return num.toFixed(2);
        }
    }

    function formatNumberFull(num) {
        if (num === null || num === undefined) return '-';
        if (typeof num !== 'number') return String(num);
        
        if (Number.isInteger(num)) {
            return num.toLocaleString();
        } else {
            return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    }

    return {
        calculatePivot,
        formatNumber,
        formatNumberFull
    };
})();
