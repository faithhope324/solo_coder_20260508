document.addEventListener('DOMContentLoaded', () => {
    const COLS = 60;
    const ROWS = 45;
    const CELL_SIZE = 12;

    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.width = COLS * CELL_SIZE;
    canvas.height = ROWS * CELL_SIZE;

    const gridManager = new GridManager(COLS, ROWS, CELL_SIZE);
    const evolutionEngine = new EvolutionEngine();
    const presetLibrary = new PresetLibrary();
    const animationController = new AnimationController(gridManager, evolutionEngine, ctx);

    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const stepBtn = document.getElementById('stepBtn');
    const clearBtn = document.getElementById('clearBtn');
    const randomBtn = document.getElementById('randomBtn');
    const speedSlider = document.getElementById('speedSlider');
    const speedValue = document.getElementById('speedValue');
    const presetSelect = document.getElementById('presetSelect');
    const placePresetBtn = document.getElementById('placePresetBtn');
    const aliveCountSpan = document.getElementById('aliveCount');
    const generationSpan = document.getElementById('generation');

    let isDrawing = false;
    let drawMode = 'draw';

    function updateStats() {
        aliveCountSpan.textContent = gridManager.countAlive();
        generationSpan.textContent = evolutionEngine.getGeneration();
    }

    animationController.setOnUpdateCallback(updateStats);

    function updateButtons() {
        const running = animationController.getIsRunning();
        startBtn.disabled = running;
        pauseBtn.disabled = !running;
    }

    startBtn.addEventListener('click', () => {
        animationController.start();
        updateButtons();
    });

    pauseBtn.addEventListener('click', () => {
        animationController.pause();
        updateButtons();
    });

    stepBtn.addEventListener('click', () => {
        animationController.step();
        updateStats();
    });

    clearBtn.addEventListener('click', () => {
        animationController.pause();
        gridManager.clear();
        animationController.draw();
        updateStats();
        updateButtons();
    });

    randomBtn.addEventListener('click', () => {
        animationController.pause();
        gridManager.randomFill(0.3);
        evolutionEngine.incrementGeneration();
        animationController.draw();
        updateStats();
        updateButtons();
    });

    speedSlider.addEventListener('input', (e) => {
        const speed = e.target.value;
        animationController.setSpeed(speed);
        const interval = Math.max(1, 1001 - speed * 10);
        speedValue.textContent = interval + 'ms';
    });

    placePresetBtn.addEventListener('click', () => {
        const presetKey = presetSelect.value;
        if (presetKey) {
            presetLibrary.placePresetAtCenter(gridManager, presetKey);
            animationController.draw();
            updateStats();
        }
    });

    function handleCanvasMouse(e, action) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const { row, col } = gridManager.getCellFromPosition(x, y);

        if (action === 'start') {
            isDrawing = true;
            drawMode = e.button === 2 ? 'erase' : 'draw';
            const value = drawMode === 'draw' ? 1 : 0;
            gridManager.setCell(row, col, value);
        } else if (action === 'move' && isDrawing) {
            const value = drawMode === 'draw' ? 1 : 0;
            gridManager.setCell(row, col, value);
        } else if (action === 'end') {
            isDrawing = false;
        }

        animationController.draw();
        updateStats();
    }

    canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        handleCanvasMouse(e, 'start');
    });

    canvas.addEventListener('mousemove', (e) => {
        handleCanvasMouse(e, 'move');
    });

    canvas.addEventListener('mouseup', (e) => {
        handleCanvasMouse(e, 'end');
    });

    canvas.addEventListener('mouseleave', (e) => {
        handleCanvasMouse(e, 'end');
    });

    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
    });

    animationController.draw();
    updateStats();
});
