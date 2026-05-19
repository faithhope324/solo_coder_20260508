class DrawingCanvas {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.lastX = 0;
        this.lastY = 0;
        this.brushSize = 4;
        this.strokes = [];
        this.currentStroke = [];
        
        this.init();
    }

    init() {
        this.setupCanvas();
        this.attachEvents();
        this.drawGrid();
    }

    setupCanvas() {
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.strokeStyle = '#1a1a2e';
    }

    drawGrid() {
        this.ctx.fillStyle = '#ffffff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.strokeStyle = '#e0e0e0';
        this.ctx.lineWidth = 0.5;
        
        for (let x = 0; x <= this.canvas.width; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.canvas.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= this.canvas.height; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        
        this.ctx.strokeStyle = '#1a1a2e';
        this.ctx.lineWidth = this.brushSize;
    }

    attachEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.startDrawing(e));
        this.canvas.addEventListener('mousemove', (e) => this.draw(e));
        this.canvas.addEventListener('mouseup', () => this.stopDrawing());
        this.canvas.addEventListener('mouseout', () => this.stopDrawing());
        
        this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e, 'start'));
        this.canvas.addEventListener('touchmove', (e) => this.handleTouch(e, 'move'));
        this.canvas.addEventListener('touchend', () => this.stopDrawing());
    }

    handleTouch(e, action) {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const mouseEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY
        };
        
        if (action === 'start') {
            this.startDrawing(mouseEvent);
        } else if (action === 'move') {
            this.draw(mouseEvent);
        }
    }

    startDrawing(e) {
        this.isDrawing = true;
        const pos = this.getPosition(e);
        this.lastX = pos.x;
        this.lastY = pos.y;
        this.currentStroke = [{ x: pos.x, y: pos.y }];
    }

    draw(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getPosition(e);
        
        this.ctx.beginPath();
        this.ctx.moveTo(this.lastX, this.lastY);
        this.ctx.lineTo(pos.x, pos.y);
        this.ctx.stroke();
        
        this.currentStroke.push({ x: pos.x, y: pos.y });
        
        this.lastX = pos.x;
        this.lastY = pos.y;
    }

    stopDrawing() {
        if (this.isDrawing && this.currentStroke.length > 0) {
            this.strokes.push([...this.currentStroke]);
        }
        this.isDrawing = false;
        this.currentStroke = [];
    }

    getPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }

    setBrushSize(size) {
        this.brushSize = size;
        this.ctx.lineWidth = size;
    }

    clear() {
        this.strokes = [];
        this.drawGrid();
    }

    getStrokes() {
        return JSON.parse(JSON.stringify(this.strokes));
    }

    getImageData() {
        return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }
}

window.DrawingCanvas = DrawingCanvas;
