class AnimationController {
    constructor(gridManager, evolutionEngine, ctx) {
        this.gridManager = gridManager;
        this.evolutionEngine = evolutionEngine;
        this.ctx = ctx;
        this.isRunning = false;
        this.animationId = null;
        this.speed = 100;
        this.lastTime = 0;
        this.onUpdateCallback = null;
    }

    setSpeed(speedValue) {
        this.speed = Math.max(1, 1001 - speedValue * 10);
    }

    setOnUpdateCallback(callback) {
        this.onUpdateCallback = callback;
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.animate();
    }

    pause() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    toggle() {
        if (this.isRunning) {
            this.pause();
        } else {
            this.start();
        }
    }

    step() {
        this.evolutionEngine.evolve(this.gridManager);
        this.draw();
        if (this.onUpdateCallback) {
            this.onUpdateCallback();
        }
    }

    animate() {
        if (!this.isRunning) return;

        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;

        if (deltaTime >= this.speed) {
            this.evolutionEngine.evolve(this.gridManager);
            this.lastTime = currentTime - (deltaTime % this.speed);
            
            if (this.onUpdateCallback) {
                this.onUpdateCallback();
            }
        }

        this.draw();
        this.animationId = requestAnimationFrame(() => this.animate());
    }

    draw() {
        this.gridManager.draw(this.ctx);
    }

    getIsRunning() {
        return this.isRunning;
    }
}
