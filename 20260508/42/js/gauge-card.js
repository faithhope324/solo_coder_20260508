class GaugeCard {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.id = options.id || `gauge-${Date.now()}`;
        this.title = options.title || '使用率';
        this.subtitle = options.subtitle || '';
        this.value = options.value || 0;
        this.maxValue = options.maxValue || 100;
        this.warningThreshold = options.warningThreshold || 70;
        this.dangerThreshold = options.dangerThreshold || 80;
        this.unit = options.unit || '%';
        this.decimals = options.decimals || 1;
        
        this.currentValue = this.value;
        this.animationFrame = null;
        
        this.render();
    }

    render() {
        const card = document.createElement('div');
        card.className = 'gauge-card';
        card.id = this.id;
        
        card.innerHTML = `
            <div class="gauge-header">
                <div>
                    <div class="gauge-title">${this.title}</div>
                    ${this.subtitle ? `<div class="gauge-subtitle">${this.subtitle}</div>` : ''}
                </div>
            </div>
            <svg class="gauge-svg" viewBox="0 0 200 120">
                <defs>
                    <linearGradient id="${this.id}-gradient-normal" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#22c55e;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#16a34a;stop-opacity:1" />
                    </linearGradient>
                    <linearGradient id="${this.id}-gradient-warning" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:1" />
                    </linearGradient>
                    <linearGradient id="${this.id}-gradient-danger" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1" />
                        <stop offset="100%" style="stop-color:#dc2626;stop-opacity:1" />
                    </linearGradient>
                </defs>
                <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="rgba(255,255,255,0.1)"
                    stroke-width="12"
                    stroke-linecap="round"
                />
                <path
                    id="${this.id}-progress"
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    fill="none"
                    stroke="url(#${this.id}-gradient-normal)"
                    stroke-width="12"
                    stroke-linecap="round"
                    stroke-dasharray="251.2"
                    stroke-dashoffset="251.2"
                />
                <circle
                    id="${this.id}-indicator"
                    cx="100"
                    cy="100"
                    r="5"
                    fill="#00d4ff"
                />
            </svg>
            <div class="gauge-value">
                <span id="${this.id}-value">${this.value.toFixed(this.decimals)}</span>${this.unit}
            </div>
        `;
        
        this.container.appendChild(card);
        
        this.cardElement = card;
        this.progressElement = card.querySelector(`#${this.id}-progress`);
        this.valueElement = card.querySelector(`#${this.id}-value`);
        this.indicatorElement = card.querySelector(`#${this.id}-indicator`);
        
        this.updateProgress(this.value);
    }

    update(newValue, animate = true) {
        const clampedValue = Math.max(0, Math.min(newValue, this.maxValue));
        
        if (animate) {
            this.animateValue(this.currentValue, clampedValue, 500);
        } else {
            this.currentValue = clampedValue;
            this.updateProgress(clampedValue);
        }
        
        this.updateStatus(clampedValue);
    }

    animateValue(start, end, duration) {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = this.easeOutCubic(progress);
            
            const currentValue = start + (end - start) * easeProgress;
            this.currentValue = currentValue;
            this.updateProgress(currentValue);
            
            if (progress < 1) {
                this.animationFrame = requestAnimationFrame(animate);
            }
        };
        
        this.animationFrame = requestAnimationFrame(animate);
    }

    easeOutCubic(x) {
        return 1 - Math.pow(1 - x, 3);
    }

    updateProgress(value) {
        const percentage = value / this.maxValue;
        const dashOffset = 251.2 * (1 - percentage);
        
        if (this.progressElement) {
            this.progressElement.style.strokeDashoffset = dashOffset;
        }
        
        if (this.indicatorElement) {
            const angle = 180 * percentage;
            const radians = (angle - 180) * (Math.PI / 180);
            const radius = 80;
            const cx = 100 + radius * Math.cos(radians);
            const cy = 100 + radius * Math.sin(radians);
            
            this.indicatorElement.setAttribute('cx', cx);
            this.indicatorElement.setAttribute('cy', cy);
        }
        
        if (this.valueElement) {
            this.valueElement.textContent = value.toFixed(this.decimals);
        }
    }

    updateStatus(value) {
        if (!this.cardElement) return;
        
        this.cardElement.classList.remove('warning', 'danger');
        
        let gradientId = `${this.id}-gradient-normal`;
        
        if (value >= this.dangerThreshold) {
            this.cardElement.classList.add('danger');
            gradientId = `${this.id}-gradient-danger`;
        } else if (value >= this.warningThreshold) {
            this.cardElement.classList.add('warning');
            gradientId = `${this.id}-gradient-warning`;
        }
        
        if (this.progressElement) {
            this.progressElement.setAttribute('stroke', `url(#${gradientId})`);
        }
    }

    getStatus(value = this.currentValue) {
        if (value >= this.dangerThreshold) return 'danger';
        if (value >= this.warningThreshold) return 'warning';
        return 'normal';
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.cardElement) {
            this.cardElement.remove();
        }
    }
}

window.GaugeCard = GaugeCard;
