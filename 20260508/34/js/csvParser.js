const CSVParser = (function() {
    function parseFile(file) {
        return new Promise((resolve, reject) => {
            Papa.parse(file, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: function(results) {
                    if (results.errors.length > 0 && results.data.length === 0) {
                        reject(new Error('CSV 解析失败: ' + results.errors[0].message));
                        return;
                    }
                    
                    const data = results.data;
                    const headers = results.meta.fields || [];
                    const columnTypes = inferColumnTypes(data, headers);
                    
                    resolve({
                        headers: headers,
                        rows: data,
                        columnTypes: columnTypes
                    });
                },
                error: function(error) {
                    reject(error);
                }
            });
        });
    }

    function inferColumnTypes(rows, headers) {
        const types = {};
        const sampleSize = Math.min(rows.length, 100);
        
        headers.forEach(header => {
            let numberCount = 0;
            let dateCount = 0;
            let stringCount = 0;
            
            for (let i = 0; i < sampleSize; i++) {
                const value = rows[i]?.[header];
                if (value === null || value === undefined || value === '') continue;
                
                if (typeof value === 'number') {
                    numberCount++;
                } else if (typeof value === 'string') {
                    if (isDateString(value)) {
                        dateCount++;
                    } else if (!isNaN(Number(value.replace(/,/g, '')))) {
                        numberCount++;
                    } else {
                        stringCount++;
                    }
                }
            }
            
            if (numberCount >= sampleSize * 0.6) {
                types[header] = 'number';
            } else if (dateCount >= sampleSize * 0.6) {
                types[header] = 'date';
            } else {
                types[header] = 'string';
            }
        });
        
        return types;
    }

    function isDateString(str) {
        if (typeof str !== 'string') return false;
        const datePatterns = [
            /^\d{4}-\d{2}-\d{2}$/,
            /^\d{4}\/\d{2}\/\d{2}$/,
            /^\d{2}-\d{2}-\d{4}$/,
            /^\d{2}\/\d{2}\/\d{4}$/,
            /^\d{4}年\d{2}月\d{2}日$/,
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        ];
        
        for (const pattern of datePatterns) {
            if (pattern.test(str.trim())) {
                const date = new Date(str);
                return !isNaN(date.getTime());
            }
        }
        return false;
    }

    function toNumber(value) {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            const num = Number(value.replace(/,/g, ''));
            return isNaN(num) ? null : num;
        }
        return null;
    }

    function getUniqueValues(data, field) {
        const values = new Set();
        data.forEach(row => {
            const val = row[field];
            if (val !== null && val !== undefined && val !== '') {
                values.add(String(val));
            }
        });
        return Array.from(values).sort();
    }

    return {
        parseFile,
        inferColumnTypes,
        toNumber,
        getUniqueValues
    };
})();
