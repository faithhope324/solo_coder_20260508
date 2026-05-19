class MathRecognizer {
    constructor() {
        this.debugMode = true;
        this.lastDebugInfo = '';
    }

    log(msg) {
        if (this.debugMode) {
            console.log('[Recognizer]', msg);
            this.lastDebugInfo += msg + '\n';
        }
    }

    recognize(strokes, canvasWidth, canvasHeight) {
        this.lastDebugInfo = '';
        this.log(`开始识别，共 ${strokes.length} 笔画`);
        
        if (strokes.length === 0) {
            return { latex: '', confidence: 0, structure: null, debug: this.lastDebugInfo };
        }

        const normalizedStrokes = this.normalizeStrokes(strokes);
        const structure = this.analyzeStructure(normalizedStrokes, canvasWidth, canvasHeight);
        
        this.log(`检测到结构: ${structure.type}`);

        if (structure.type === 'fraction') {
            const result = this.recognizeFraction(structure, normalizedStrokes);
            result.debug = this.lastDebugInfo;
            return result;
        }
        
        if (structure.type === 'sqrt') {
            const result = this.recognizeSqrt(structure, normalizedStrokes);
            result.debug = this.lastDebugInfo;
            return result;
        }

        const symbols = this.segmentByProjection(normalizedStrokes, canvasWidth, canvasHeight);
        this.log(`分割为 ${symbols.length} 个符号`);
        
        let latex = '';
        let totalConfidence = 0;

        for (let i = 0; i < symbols.length; i++) {
            const symbolStrokes = symbols[i];
            const result = this.recognizeSymbol(symbolStrokes);
            this.log(`符号 ${i+1}: 识别为 "${result.latex}"，置信度 ${result.confidence.toFixed(2)}`);
            latex += result.latex;
            totalConfidence += result.confidence;
        }

        const avgConfidence = symbols.length > 0 ? totalConfidence / symbols.length : 0;
        
        return {
            latex: latex || 'x',
            confidence: avgConfidence,
            structure: structure,
            debug: this.lastDebugInfo
        };
    }

    normalizeStrokes(strokes) {
        return strokes.map(stroke => {
            if (stroke.length < 2) return stroke;
            
            const simplified = [];
            simplified.push(stroke[0]);
            
            for (let i = 1; i < stroke.length - 1; i++) {
                const prev = simplified[simplified.length - 1];
                const curr = stroke[i];
                const dist = Math.sqrt(Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2));
                if (dist > 3) {
                    simplified.push(curr);
                }
            }
            
            simplified.push(stroke[stroke.length - 1]);
            return simplified;
        });
    }

    getBoundingBox(strokes) {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;
        
        for (const stroke of strokes) {
            for (const p of stroke) {
                minX = Math.min(minX, p.x);
                maxX = Math.max(maxX, p.x);
                minY = Math.min(minY, p.y);
                maxY = Math.max(maxY, p.y);
            }
        }
        
        return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
    }

    analyzeStructure(strokes, canvasWidth, canvasHeight) {
        const horizontalLines = [];
        const sqrtSigns = [];

        for (const stroke of strokes) {
            const analysis = this.analyzeStroke(stroke);
            
            if (analysis.isHorizontal && analysis.length > canvasWidth * 0.25 && analysis.length > 100) {
                horizontalLines.push({
                    stroke: stroke,
                    y: analysis.avgY,
                    x1: analysis.minX,
                    x2: analysis.maxX,
                    length: analysis.length
                });
            }
            
            if (this.isSqrtSign(stroke, analysis)) {
                sqrtSigns.push({
                    stroke: stroke,
                    x: analysis.minX,
                    y: analysis.minY,
                    analysis: analysis
                });
            }
        }

        if (horizontalLines.length > 0) {
            const mainLine = horizontalLines.reduce((a, b) => b.length > a.length ? b : a);
            
            const topStrokes = strokes.filter(s => {
                if (s === mainLine.stroke) return false;
                const a = this.analyzeStroke(s);
                return a.maxY < mainLine.y - 15;
            });
            
            const bottomStrokes = strokes.filter(s => {
                if (s === mainLine.stroke) return false;
                const a = this.analyzeStroke(s);
                return a.minY > mainLine.y + 15;
            });

            this.log(`横线检测: 上方${topStrokes.length}笔, 下方${bottomStrokes.length}笔`);

            if (topStrokes.length > 0 && bottomStrokes.length > 0) {
                return {
                    type: 'fraction',
                    line: mainLine,
                    topStrokes: topStrokes,
                    bottomStrokes: bottomStrokes
                };
            }
        }

        if (sqrtSigns.length > 0) {
            const sqrt = sqrtSigns[0];
            const innerStrokes = strokes.filter(s => {
                if (s === sqrt.stroke) return false;
                const a = this.analyzeStroke(s);
                return a.minX > sqrt.x + 15;
            });

            this.log(`根号检测: 内部${innerStrokes.length}笔`);

            if (innerStrokes.length > 0) {
                return {
                    type: 'sqrt',
                    sqrt: sqrt,
                    innerStrokes: innerStrokes
                };
            }
        }

        return { type: 'normal' };
    }

    analyzeStroke(stroke) {
        if (!stroke || stroke.length < 2) {
            return {
                isHorizontal: false,
                isVertical: false,
                isDiagonal: false,
                isClosed: false,
                isCurved: false,
                length: 0,
                avgY: 0,
                minX: 0, maxX: 0, minY: 0, maxY: 0,
                width: 0, height: 0,
                startPoint: {x:0, y:0},
                endPoint: {x:0, y:0},
                direction: 'unknown'
            };
        }

        const xs = stroke.map(p => p.x);
        const ys = stroke.map(p => p.y);
        
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const avgY = ys.reduce((a, b) => a + b, 0) / ys.length;
        const avgX = xs.reduce((a, b) => a + b, 0) / xs.length;
        
        const width = maxX - minX;
        const height = maxY - minY;
        
        let length = 0;
        for (let i = 1; i < stroke.length; i++) {
            length += Math.sqrt(
                Math.pow(stroke[i].x - stroke[i-1].x, 2) + 
                Math.pow(stroke[i].y - stroke[i-1].y, 2)
            );
        }

        const isHorizontal = height < 25 && width > height * 2 && length > 30;
        const isVertical = width < 25 && height > width * 2 && length > 30;
        
        const startPoint = stroke[0];
        const endPoint = stroke[stroke.length - 1];
        const closingDist = Math.sqrt(
            Math.pow(endPoint.x - startPoint.x, 2) + 
            Math.pow(endPoint.y - startPoint.y, 2)
        );
        const isClosed = closingDist < Math.max(width, height) * 0.3 && length > 50;
        
        const isCurved = this.hasCurve(stroke);
        
        let direction = 'unknown';
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        if (Math.abs(angle) < 20) direction = 'right';
        else if (Math.abs(angle - 180) < 20 || Math.abs(angle + 180) < 20) direction = 'left';
        else if (angle > 70 && angle < 110) direction = 'down';
        else if (angle < -70 && angle > -110) direction = 'up';
        else if (angle > 20 && angle < 70) direction = 'down-right';
        else if (angle < -20 && angle > -70) direction = 'up-right';
        
        const diagonalRatio = Math.abs(width - height) / Math.max(width, height);
        const isDiagonal = diagonalRatio < 0.5 && !isHorizontal && !isVertical && length > 40;

        return { 
            isHorizontal, isVertical, isDiagonal, isClosed, isCurved,
            length, avgY, avgX, minX, maxX, minY, maxY, 
            width, height, startPoint, endPoint, direction, closingDist
        };
    }

    hasCurve(stroke) {
        if (stroke.length < 8) return false;
        
        let totalAngleChange = 0;
        for (let i = 3; i < stroke.length - 3; i++) {
            const v1x = stroke[i].x - stroke[i-3].x;
            const v1y = stroke[i].y - stroke[i-3].y;
            const v2x = stroke[i+3].x - stroke[i].x;
            const v2y = stroke[i+3].y - stroke[i].y;
            
            const dot = v1x * v2x + v1y * v2y;
            const mag1 = Math.sqrt(v1x*v1x + v1y*v1y);
            const mag2 = Math.sqrt(v2x*v2x + v2y*v2y);
            
            if (mag1 > 0 && mag2 > 0) {
                const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
                const angle = Math.acos(cosAngle);
                totalAngleChange += angle;
            }
        }
        
        return totalAngleChange > Math.PI * 0.4;
    }

    isSqrtSign(stroke, analysis) {
        if (stroke.length < 15) return false;
        if (analysis.width < 40 || analysis.height < 40) return false;
        
        const startY = analysis.startPoint.y;
        const endY = analysis.endPoint.y;
        const startX = analysis.startPoint.x;
        const endX = analysis.endPoint.x;
        
        const goesDown = endY > startY + 20;
        const goesRight = endX > startX + 30;
        
        let hasSharpTurn = false;
        let minY = Infinity;
        let turnIndex = -1;
        
        for (let i = 0; i < stroke.length; i++) {
            if (stroke[i].y < minY) {
                minY = stroke[i].y;
                turnIndex = i;
            }
        }
        
        if (turnIndex > 3 && turnIndex < stroke.length - 3) {
            const beforeAngle = Math.atan2(
                stroke[turnIndex].y - stroke[Math.max(0, turnIndex-5)].y,
                stroke[turnIndex].x - stroke[Math.max(0, turnIndex-5)].x
            );
            const afterAngle = Math.atan2(
                stroke[Math.min(stroke.length-1, turnIndex+5)].y - stroke[turnIndex].y,
                stroke[Math.min(stroke.length-1, turnIndex+5)].x - stroke[turnIndex].x
            );
            const angleDiff = Math.abs(afterAngle - beforeAngle);
            hasSharpTurn = angleDiff > Math.PI / 3;
        }
        
        return goesDown && goesRight && hasSharpTurn && analysis.isCurved;
    }

    segmentByProjection(strokes, canvasWidth, canvasHeight) {
        if (strokes.length === 0) return [];
        
        const bbox = this.getBoundingBox(strokes);
        const padding = 20;
        
        const gridSize = 8;
        const gridWidth = Math.ceil(canvasWidth / gridSize);
        const gridHeight = Math.ceil(canvasHeight / gridSize);
        const grid = Array(gridHeight).fill(null).map(() => Array(gridWidth).fill(false));
        
        for (const stroke of strokes) {
            for (const p of stroke) {
                const gx = Math.min(Math.floor(p.x / gridSize), gridWidth - 1);
                const gy = Math.min(Math.floor(p.y / gridSize), gridHeight - 1);
                if (gx >= 0 && gy >= 0) {
                    grid[gy][gx] = true;
                }
            }
        }
        
        const xProjection = [];
        for (let x = 0; x < gridWidth; x++) {
            let count = 0;
            for (let y = 0; y < gridHeight; y++) {
                if (grid[y][x]) count++;
            }
            xProjection.push(count);
        }
        
        const gaps = [];
        let inGap = true;
        let gapStart = 0;
        
        for (let x = 0; x < xProjection.length; x++) {
            if (xProjection[x] === 0) {
                if (!inGap) {
                    inGap = true;
                    gapStart = x;
                }
            } else {
                if (inGap) {
                    const gapWidth = x - gapStart;
                    if (gapWidth >= 3) {
                        gaps.push({ start: gapStart * gridSize, end: x * gridSize });
                    }
                    inGap = false;
                }
            }
        }
        
        const splitPoints = [bbox.minX - padding];
        for (const gap of gaps) {
            const gapCenter = (gap.start + gap.end) / 2;
            if (gapCenter > bbox.minX && gapCenter < bbox.maxX) {
                splitPoints.push(gapCenter);
            }
        }
        splitPoints.push(bbox.maxX + padding);
        
        const symbolGroups = [];
        for (let i = 0; i < splitPoints.length - 1; i++) {
            const x1 = splitPoints[i];
            const x2 = splitPoints[i + 1];
            
            const groupStrokes = strokes.filter(s => {
                const a = this.analyzeStroke(s);
                const centerX = (a.minX + a.maxX) / 2;
                return centerX >= x1 && centerX <= x2;
            });
            
            if (groupStrokes.length > 0) {
                symbolGroups.push(groupStrokes);
            }
        }
        
        if (symbolGroups.length === 0 && strokes.length > 0) {
            symbolGroups.push([...strokes]);
        }
        
        return symbolGroups;
    }

    recognizeFraction(structure, strokes) {
        const topResult = this.recognizeSymbolsFromStrokes(structure.topStrokes);
        const bottomResult = this.recognizeSymbolsFromStrokes(structure.bottomStrokes);

        const topLatex = topResult.latex || 'a';
        const bottomLatex = bottomResult.latex || 'b';

        this.log(`分数识别: 分子="${topLatex}", 分母="${bottomLatex}"`);

        return {
            latex: `\\frac{${topLatex}}{${bottomLatex}}`,
            confidence: (topResult.confidence + bottomResult.confidence) / 2,
            structure: structure
        };
    }

    recognizeSqrt(structure, strokes) {
        const innerResult = this.recognizeSymbolsFromStrokes(structure.innerStrokes);
        const innerLatex = innerResult.latex || 'x';

        this.log(`根号识别: 内部="${innerLatex}"`);

        return {
            latex: `\\sqrt{${innerLatex}}`,
            confidence: innerResult.confidence,
            structure: structure
        };
    }

    recognizeSymbolsFromStrokes(strokes) {
        if (strokes.length === 0) {
            return { latex: '', confidence: 0.5 };
        }

        const bbox = this.getBoundingBox(strokes);
        const symbols = this.segmentByProjection(strokes, bbox.maxX + 50, bbox.maxY + 50);
        
        let latex = '';
        let totalConfidence = 0;

        for (const symbolStrokes of symbols) {
            const result = this.recognizeSymbol(symbolStrokes);
            latex += result.latex;
            totalConfidence += result.confidence;
        }

        return {
            latex,
            confidence: symbols.length > 0 ? totalConfidence / symbols.length : 0.5
        };
    }

    recognizeSymbol(symbolStrokes) {
        const features = this.extractFeatures(symbolStrokes);
        return this.matchSymbol(features, symbolStrokes);
    }

    extractFeatures(symbolStrokes) {
        const bbox = this.getBoundingBox(symbolStrokes);
        const strokeCount = symbolStrokes.length;
        
        const analyses = symbolStrokes.map(s => this.analyzeStroke(s));
        
        const horizontalCount = analyses.filter(a => a.isHorizontal).length;
        const verticalCount = analyses.filter(a => a.isVertical).length;
        const diagonalCount = analyses.filter(a => a.isDiagonal).length;
        const curvedCount = analyses.filter(a => a.isCurved).length;
        const closedCount = analyses.filter(a => a.isClosed).length;
        
        const aspectRatio = bbox.height > 0 ? bbox.width / bbox.height : 1;
        
        let totalPoints = 0;
        for (const s of symbolStrokes) totalPoints += s.length;
        
        let totalDirectionChanges = 0;
        for (const s of symbolStrokes) {
            totalDirectionChanges += this.countDirectionChanges(s);
        }

        return {
            bbox,
            strokeCount,
            horizontalCount,
            verticalCount,
            diagonalCount,
            curvedCount,
            closedCount,
            aspectRatio,
            totalPoints,
            totalDirectionChanges,
            analyses
        };
    }

    countDirectionChanges(stroke) {
        if (stroke.length < 6) return 0;
        
        let changes = 0;
        let lastDir = null;
        
        for (let i = 3; i < stroke.length; i += 3) {
            const dx = stroke[i].x - stroke[i-3].x;
            const dy = stroke[i].y - stroke[i-3].y;
            
            let dir;
            if (Math.abs(dx) > Math.abs(dy)) {
                dir = dx > 0 ? 'right' : 'left';
            } else {
                dir = dy > 0 ? 'down' : 'up';
            }
            
            if (lastDir && dir !== lastDir) {
                changes++;
            }
            lastDir = dir;
        }
        
        return changes;
    }

    matchSymbol(features, strokes) {
        const rules = this.getRules();
        let bestMatch = null;
        let bestScore = -1;

        this.log(`  特征: ${features.strokeCount}笔, H:${features.horizontalCount}, V:${features.verticalCount}, C:${features.curvedCount}, 闭:${features.closedCount}, 宽高比:${features.aspectRatio.toFixed(2)}`);

        for (const rule of rules) {
            const score = rule.check(features, strokes);
            if (score > bestScore) {
                bestScore = score;
                bestMatch = rule;
            }
        }

        if (bestMatch && bestScore >= 0.3) {
            return { latex: bestMatch.latex, confidence: bestScore };
        }

        return { latex: 'x', confidence: 0.2 };
    }

    getRules() {
        return [
            {
                latex: '=',
                check: (f) => {
                    if (f.strokeCount === 2 && f.horizontalCount === 2) {
                        const h1 = f.analyses[0];
                        const h2 = f.analyses[1];
                        const yDiff = Math.abs(h1.avgY - h2.avgY);
                        if (yDiff > 15 && yDiff < 50) return 0.98;
                    }
                    return 0;
                }
            },
            {
                latex: '+',
                check: (f) => {
                    if (f.strokeCount >= 2 && f.horizontalCount >= 1 && f.verticalCount >= 1) {
                        const h = f.analyses.find(a => a.isHorizontal);
                        const v = f.analyses.find(a => a.isVertical);
                        if (h && v) {
                            const overlap = Math.abs(h.avgX - v.avgX) < 35 && Math.abs(h.avgY - v.avgY) < 35;
                            if (overlap) return 0.95;
                        }
                    }
                    return 0;
                }
            },
            {
                latex: 'x',
                check: (f) => {
                    if (f.strokeCount === 2 && f.diagonalCount >= 2) return 0.95;
                    if (f.strokeCount === 2) {
                        const a1 = f.analyses[0];
                        const a2 = f.analyses[1];
                        const overlap = Math.abs(a1.avgX - a2.avgX) < 40 && Math.abs(a1.avgY - a2.avgY) < 40;
                        if (overlap && a1.isDiagonal !== a2.isDiagonal) return 0.85;
                    }
                    if (f.strokeCount >= 1 && f.diagonalCount >= 1 && f.strokeCount <= 2) return 0.5;
                    return 0;
                }
            },
            {
                latex: '2',
                check: (f) => {
                    if (f.strokeCount === 1 && f.curvedCount >= 1 && f.horizontalCount >= 1 && f.totalDirectionChanges >= 2) return 0.85;
                    if (f.strokeCount === 1 && f.totalDirectionChanges >= 2 && f.aspectRatio < 0.8) return 0.6;
                    return 0;
                }
            },
            {
                latex: '1',
                check: (f) => {
                    if (f.strokeCount === 1 && f.verticalCount >= 1 && f.aspectRatio < 0.5) return 0.95;
                    if (f.strokeCount === 1 && f.analyses[0].isVertical) return 0.85;
                    if (f.strokeCount === 1 && f.aspectRatio < 0.6 && f.diagonalCount === 0) return 0.7;
                    return 0;
                }
            },
            {
                latex: '-',
                check: (f) => {
                    if (f.strokeCount === 1 && f.horizontalCount === 1 && f.verticalCount === 0 && f.aspectRatio > 2.5) return 0.95;
                    return 0;
                }
            },
            {
                latex: '0',
                check: (f) => {
                    if (f.strokeCount === 1 && f.closedCount >= 1 && f.curvedCount >= 1 && f.aspectRatio > 0.6 && f.aspectRatio < 1.6) return 0.92;
                    if (f.strokeCount === 1 && f.analyses[0].isCurved && f.analyses[0].closingDist < 35) return 0.7;
                    return 0;
                }
            },
            {
                latex: 'o',
                check: (f) => {
                    if (f.strokeCount === 1 && f.closedCount >= 1 && f.aspectRatio > 0.7 && f.aspectRatio < 1.4) return 0.85;
                    return 0;
                }
            },
            {
                latex: 'c',
                check: (f) => {
                    if (f.strokeCount === 1 && f.curvedCount >= 1 && f.closedCount === 0 && f.aspectRatio < 1.2) return 0.8;
                    return 0;
                }
            },
            {
                latex: 'y',
                check: (f) => {
                    if (f.strokeCount >= 1 && f.diagonalCount >= 1 && f.totalDirectionChanges >= 1 && f.aspectRatio > 0.5) return 0.7;
                    if (f.strokeCount === 2) return 0.5;
                    return 0;
                }
            },
            {
                latex: 'z',
                check: (f) => {
                    if (f.strokeCount === 1 && f.horizontalCount >= 1 && f.totalDirectionChanges >= 2 && f.aspectRatio > 1) return 0.75;
                    return 0;
                }
            },
            {
                latex: '3',
                check: (f) => {
                    if (f.strokeCount === 1 && f.curvedCount >= 1 && f.totalDirectionChanges >= 3) return 0.7;
                    return 0;
                }
            },
            {
                latex: '4',
                check: (f) => {
                    if (f.strokeCount === 2 && f.verticalCount >= 1 && f.horizontalCount >= 1) return 0.7;
                    if (f.strokeCount === 3) return 0.6;
                    return 0;
                }
            },
            {
                latex: '5',
                check: (f) => {
                    if (f.strokeCount >= 1 && f.horizontalCount >= 1 && f.curvedCount >= 1 && f.totalDirectionChanges >= 2) return 0.65;
                    return 0;
                }
            },
            {
                latex: '6',
                check: (f) => {
                    if (f.strokeCount === 1 && f.closedCount >= 1 && f.curvedCount >= 1 && f.totalDirectionChanges >= 2) return 0.65;
                    return 0;
                }
            },
            {
                latex: '7',
                check: (f) => {
                    if (f.strokeCount === 2 && f.horizontalCount >= 1 && f.diagonalCount >= 1) return 0.85;
                    if (f.strokeCount === 1 && f.horizontalCount >= 1 && f.analyses[0].direction === 'down-right') return 0.7;
                    return 0;
                }
            },
            {
                latex: '8',
                check: (f) => {
                    if (f.strokeCount === 1 && f.closedCount >= 1 && f.totalDirectionChanges >= 4) return 0.75;
                    if (f.strokeCount === 2 && f.closedCount >= 1) return 0.65;
                    return 0;
                }
            },
            {
                latex: '9',
                check: (f) => {
                    if (f.strokeCount === 1 && f.closedCount >= 1 && f.curvedCount >= 1) return 0.6;
                    return 0;
                }
            },
            {
                latex: 'a',
                check: (f) => {
                    if (f.strokeCount >= 1 && f.closedCount >= 1 && f.verticalCount >= 1 && f.aspectRatio > 0.6) return 0.7;
                    return 0;
                }
            },
            {
                latex: 'b',
                check: (f) => {
                    if (f.strokeCount >= 1 && f.verticalCount >= 1 && f.curvedCount >= 1) {
                        const v = f.analyses.find(a => a.isVertical);
                        if (v && v.direction === 'down') return 0.7;
                    }
                    return 0;
                }
            },
            {
                latex: 'd',
                check: (f) => {
                    if (f.strokeCount >= 1 && f.verticalCount >= 1 && f.curvedCount >= 1) {
                        const v = f.analyses.find(a => a.isVertical);
                        if (v && v.direction === 'up') return 0.7;
                    }
                    return 0;
                }
            },
            {
                latex: 'e',
                check: (f) => {
                    if (f.strokeCount === 1 && f.curvedCount >= 1 && f.horizontalCount >= 1) return 0.6;
                    return 0;
                }
            },
            {
                latex: 'f',
                check: (f) => {
                    if (f.strokeCount >= 1 && f.verticalCount >= 1 && f.horizontalCount >= 1) return 0.55;
                    return 0;
                }
            },
            {
                latex: 'g',
                check: (f) => {
                    if (f.strokeCount >= 1 && f.closedCount >= 1 && f.totalDirectionChanges >= 2) return 0.5;
                    return 0;
                }
            },
            {
                latex: 'h',
                check: (f) => {
                    if (f.strokeCount >= 1 && f.verticalCount >= 2) return 0.6;
                    return 0;
                }
            },
            {
                latex: 'i',
                check: (f) => {
                    if (f.strokeCount === 2 && f.verticalCount >= 1) return 0.7;
                    return 0;
                }
            },
            {
                latex: 'j',
                check: (f) => {
                    if (f.strokeCount === 2 && f.verticalCount >= 1 && f.totalDirectionChanges >= 1) return 0.6;
                    return 0;
                }
            },
            {
                latex: 'k',
                check: (f) => {
                    if (f.strokeCount >= 1 && f.verticalCount >= 1 && f.diagonalCount >= 1) return 0.55;
                    return 0;
                }
            },
            {
                latex: 'l',
                check: (f) => {
                    if (f.strokeCount === 1 && f.verticalCount >= 1) return 0.6;
                    return 0;
                }
            },
            {
                latex: 'm',
                check: (f) => {
                    if (f.strokeCount >= 1 && f.verticalCount >= 2 && f.totalDirectionChanges >= 2) return 0.6;
                    return 0;
                }
            },
            {
                latex: 'n',
                check: (f) => {
                    if (f.strokeCount >= 1 && f.verticalCount >= 1 && f.totalDirectionChanges >= 1) return 0.55;
                    return 0;
                }
            },
            {
                latex: 'p',
                check: (f) => {
                    if (f.strokeCount >= 1 && f.verticalCount >= 1 && f.closedCount >= 1) return 0.6;
                    return 0;
                }
            },
            {
                latex: 'q',
                check: (f) => {
                    if (f.strokeCount >= 1 && f.verticalCount >= 1 && f.closedCount >= 1 && f.totalDirectionChanges >= 1) return 0.55;
                    return 0;
                }
            },
            {
                latex: 'r',
                check: (f) => {
                    if (f.strokeCount >= 1 && f.verticalCount >= 1 && f.curvedCount >= 1) return 0.5;
                    return 0;
                }
            },
            {
                latex: 's',
                check: (f) => {
                    if (f.strokeCount === 1 && f.curvedCount >= 1 && f.totalDirectionChanges >= 3) return 0.7;
                    return 0;
                }
            },
            {
                latex: 't',
                check: (f) => {
                    if (f.strokeCount >= 1 && f.verticalCount >= 1 && f.horizontalCount >= 1) return 0.6;
                    return 0;
                }
            },
            {
                latex: 'u',
                check: (f) => {
                    if (f.strokeCount === 1 && f.curvedCount >= 1 && f.verticalCount >= 1) return 0.6;
                    if (f.strokeCount === 2 && f.verticalCount >= 2) return 0.55;
                    return 0;
                }
            },
            {
                latex: 'v',
                check: (f) => {
                    if (f.strokeCount === 1 && f.diagonalCount >= 1 && f.totalDirectionChanges >= 1) return 0.75;
                    if (f.strokeCount === 2 && f.diagonalCount >= 1) return 0.65;
                    return 0;
                }
            },
            {
                latex: 'w',
                check: (f) => {
                    if (f.strokeCount === 1 && f.totalDirectionChanges >= 3) return 0.6;
                    if (f.strokeCount >= 2) return 0.5;
                    return 0;
                }
            }
        ];
    }
}

window.MathRecognizer = MathRecognizer;
