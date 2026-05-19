class EvolutionEngine {
    constructor() {
        this.generation = 0;
    }

    countNeighbors(gridManager, row, col) {
        let count = 0;
        for (let i = -1; i <= 1; i++) {
            for (let j = -1; j <= 1; j++) {
                if (i === 0 && j === 0) continue;
                count += gridManager.getCell(row + i, col + j);
            }
        }
        return count;
    }

    getNextState(currentState, neighborCount) {
        if (currentState === 1) {
            if (neighborCount < 2 || neighborCount > 3) {
                return 0;
            }
            return 1;
        } else {
            if (neighborCount === 3) {
                return 1;
            }
            return 0;
        }
    }

    evolve(gridManager) {
        const cols = gridManager.cols;
        const rows = gridManager.rows;
        const newGrid = [];

        for (let i = 0; i < rows; i++) {
            newGrid[i] = [];
            for (let j = 0; j < cols; j++) {
                const currentState = gridManager.getCell(i, j);
                const neighborCount = this.countNeighbors(gridManager, i, j);
                newGrid[i][j] = this.getNextState(currentState, neighborCount);
            }
        }

        gridManager.copyFrom(newGrid);
        this.generation++;
    }

    reset() {
        this.generation = 0;
    }

    getGeneration() {
        return this.generation;
    }

    incrementGeneration() {
        this.generation++;
    }
}
