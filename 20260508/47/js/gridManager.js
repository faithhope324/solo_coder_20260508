class GridManager {
    constructor(cols, rows, cellSize) {
        this.cols = cols;
        this.rows = rows;
        this.cellSize = cellSize;
        this.grid = this.createEmptyGrid();
        this.aliveCount = 0;
    }

    createEmptyGrid() {
        const grid = [];
        for (let i = 0; i < this.rows; i++) {
            grid[i] = [];
            for (let j = 0; j < this.cols; j++) {
                grid[i][j] = 0;
            }
        }
        return grid;
    }

    clear() {
        this.grid = this.createEmptyGrid();
        this.aliveCount = 0;
    }

    getCell(row, col) {
        if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
            return 0;
        }
        return this.grid[row][col];
    }

    setCell(row, col, value) {
        if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
            const oldValue = this.grid[row][col];
            this.grid[row][col] = value;
            if (oldValue === 0 && value === 1) {
                this.aliveCount++;
            } else if (oldValue === 1 && value === 0) {
                this.aliveCount--;
            }
        }
    }

    toggleCell(row, col) {
        const currentValue = this.getCell(row, col);
        this.setCell(row, col, currentValue === 0 ? 1 : 0);
    }

    randomFill(probability = 0.3) {
        this.aliveCount = 0;
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                this.grid[i][j] = Math.random() < probability ? 1 : 0;
                if (this.grid[i][j] === 1) {
                    this.aliveCount++;
                }
            }
        }
    }

    countAlive() {
        return this.aliveCount;
    }

    copyFrom(otherGrid) {
        this.aliveCount = 0;
        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                this.grid[i][j] = otherGrid[i][j];
                if (this.grid[i][j] === 1) {
                    this.aliveCount++;
                }
            }
        }
    }

    placePattern(pattern, startRow, startCol) {
        for (let i = 0; i < pattern.length; i++) {
            for (let j = 0; j < pattern[i].length; j++) {
                if (pattern[i][j] === 1) {
                    const row = startRow + i;
                    const col = startCol + j;
                    if (row >= 0 && row < this.rows && col >= 0 && col < this.cols) {
                        this.setCell(row, col, 1);
                    }
                }
            }
        }
    }

    draw(ctx) {
        ctx.clearRect(0, 0, this.cols * this.cellSize, this.rows * this.cellSize);

        for (let i = 0; i < this.rows; i++) {
            for (let j = 0; j < this.cols; j++) {
                const x = j * this.cellSize;
                const y = i * this.cellSize;

                if (this.grid[i][j] === 1) {
                    const gradient = ctx.createRadialGradient(
                        x + this.cellSize / 2, y + this.cellSize / 2, 0,
                        x + this.cellSize / 2, y + this.cellSize / 2, this.cellSize / 2
                    );
                    gradient.addColorStop(0, '#00ff88');
                    gradient.addColorStop(1, '#00aa55');
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
                    
                    ctx.shadowColor = '#00ff88';
                    ctx.shadowBlur = 5;
                    ctx.fillRect(x + 1, y + 1, this.cellSize - 2, this.cellSize - 2);
                    ctx.shadowBlur = 0;
                }
            }
        }

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= this.cols; i++) {
            ctx.beginPath();
            ctx.moveTo(i * this.cellSize, 0);
            ctx.lineTo(i * this.cellSize, this.rows * this.cellSize);
            ctx.stroke();
        }
        for (let i = 0; i <= this.rows; i++) {
            ctx.beginPath();
            ctx.moveTo(0, i * this.cellSize);
            ctx.lineTo(this.cols * this.cellSize, i * this.cellSize);
            ctx.stroke();
        }
    }

    getCellFromPosition(x, y) {
        const col = Math.floor(x / this.cellSize);
        const row = Math.floor(y / this.cellSize);
        return { row, col };
    }
}
