class SeismicSimulationApp {
    constructor() {
        this.state = {
            configured: false,
            running: false,
            paused: false,
            playbackMode: false,
            currentStep: 0,
            totalSteps: 0,
            dt: 0,
            frames: [],
            receiverData: {},
            receiverNames: [],
            currentFrameIndex: 0,
            animationInterval: null,
            sourcePosition: { x: 0, z: 0 },
            receivers: []
        };

        this.canvases = {};
        this.ctxs = {};
        this.initCanvases();
        this.initColormaps();
        this.bindEvents();
        this.resizeCanvases();
        window.addEventListener('resize', () => this.resizeCanvases());
    }

    initCanvases() {
        this.canvases.wavefield = document.getElementById('wavefield-canvas');
        this.canvases.colorbar = document.getElementById('colorbar-canvas');
        this.canvases.seismogram = document.getElementById('seismogram-canvas');
        
        this.ctxs.wavefield = this.canvases.wavefield.getContext('2d');
        this.ctxs.colorbar = this.canvases.colorbar.getContext('2d');
        this.ctxs.seismogram = this.canvases.seismogram.getContext('2d');
    }

    initColormaps() {
        this.colormaps = {
            seismic: this.createSeismicColormap(),
            heatmap: this.createHeatmapColormap(),
            grayscale: this.createGrayscaleColormap(),
            viridis: this.createViridisColormap()
        };
    }

    createSeismicColormap() {
        const colors = [];
        for (let i = 0; i < 256; i++) {
            const t = i / 255;
            let r, g, b;
            if (t < 0.5) {
                const tt = t * 2;
                r = Math.floor(255 * (1 - tt));
                g = Math.floor(255 * (1 - tt));
                b = 255;
            } else {
                const tt = (t - 0.5) * 2;
                r = 255;
                g = Math.floor(255 * (1 - tt));
                b = Math.floor(255 * (1 - tt));
            }
            colors.push([r, g, b]);
        }
        return colors;
    }

    createHeatmapColormap() {
        const colors = [];
        for (let i = 0; i < 256; i++) {
            const t = i / 255;
            let r, g, b;
            if (t < 0.25) {
                r = 0;
                g = Math.floor(255 * t * 4);
                b = 255;
            } else if (t < 0.5) {
                r = 0;
                g = 255;
                b = Math.floor(255 * (1 - (t - 0.25) * 4));
            } else if (t < 0.75) {
                r = Math.floor(255 * (t - 0.5) * 4);
                g = 255;
                b = 0;
            } else {
                r = 255;
                g = Math.floor(255 * (1 - (t - 0.75) * 4));
                b = 0;
            }
            colors.push([r, g, b]);
        }
        return colors;
    }

    createGrayscaleColormap() {
        const colors = [];
        for (let i = 0; i < 256; i++) {
            colors.push([i, i, i]);
        }
        return colors;
    }

    createViridisColormap() {
        const colors = [];
        const stops = [
            [0.267, 0.004, 0.329],
            [0.283, 0.141, 0.458],
            [0.254, 0.265, 0.530],
            [0.207, 0.372, 0.553],
            [0.164, 0.471, 0.558],
            [0.128, 0.567, 0.551],
            [0.135, 0.659, 0.518],
            [0.267, 0.749, 0.441],
            [0.478, 0.821, 0.318],
            [0.741, 0.873, 0.150],
            [0.993, 0.906, 0.144]
        ];
        
        for (let i = 0; i < 256; i++) {
            const t = i / 255;
            const idx = t * (stops.length - 1);
            const low = Math.floor(idx);
            const high = Math.min(low + 1, stops.length - 1);
            const f = idx - low;
            
            const r = Math.floor(255 * (stops[low][0] + f * (stops[high][0] - stops[low][0])));
            const g = Math.floor(255 * (stops[low][1] + f * (stops[high][1] - stops[low][1])));
            const b = Math.floor(255 * (stops[low][2] + f * (stops[high][2] - stops[low][2])));
            colors.push([r, g, b]);
        }
        return colors;
    }

    resizeCanvases() {
        const wavefieldWrapper = this.canvases.wavefield.parentElement;
        const wrapperRect = wavefieldWrapper.getBoundingClientRect();
        
        this.canvases.wavefield.width = wrapperRect.width - 80;
        this.canvases.wavefield.height = wrapperRect.height;
        
        this.canvases.colorbar.width = 40;
        this.canvases.colorbar.height = wrapperRect.height;
        
        const seismoWrapper = this.canvases.seismogram.parentElement;
        const seismoRect = seismoWrapper.getBoundingClientRect();
        this.canvases.seismogram.width = seismoRect.width - 40;
        this.canvases.seismogram.height = seismoRect.height - 60;

        this.drawColorbar();
        if (this.state.frames.length > 0) {
            this.drawWavefield(this.state.frames[this.state.currentFrameIndex]);
        }
        this.drawSeismogram();
    }

    bindEvents() {
        document.getElementById('btn-configure').addEventListener('click', () => this.configureSimulation());
        document.getElementById('btn-run').addEventListener('click', () => this.runSimulation());
        document.getElementById('btn-pause').addEventListener('click', () => this.togglePause());
        document.getElementById('btn-reset').addEventListener('click', () => this.resetSimulation());
        
        document.getElementById('colormap').addEventListener('change', () => {
            this.drawColorbar();
            if (this.state.frames.length > 0) {
                this.drawWavefield(this.state.frames[this.state.currentFrameIndex]);
            }
        });
        
        document.getElementById('show-all-traces').addEventListener('change', () => this.drawSeismogram());
        document.getElementById('selected-receiver').addEventListener('change', () => this.drawSeismogram());
        
        this.canvases.wavefield.addEventListener('click', (e) => this.handleCanvasClick(e));
    }

    handleCanvasClick(e) {
        if (!this.state.configured) return;
        
        const rect = this.canvases.wavefield.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const z = e.clientY - rect.top;
        
        const nx = parseInt(document.getElementById('grid-nx').value);
        const nz = parseInt(document.getElementById('grid-nz').value);
        
        const gridX = Math.floor((x / this.canvases.wavefield.width) * nx);
        const gridZ = Math.floor((z / this.canvases.wavefield.height) * nz);
        
        if (e.shiftKey) {
            document.getElementById('source-x').value = gridX;
            document.getElementById('source-z').value = gridZ;
            this.state.sourcePosition = { x: gridX, z: gridZ };
            this.showMessage('震源位置已更新，点击"初始化模拟"重新配置');
        } else {
            this.addReceiver(gridX, gridZ);
        }
    }

    showMessage(text) {
        const statusText = document.getElementById('status-text');
        const original = statusText.textContent;
        statusText.textContent = text;
        setTimeout(() => statusText.textContent = original, 2000);
    }

    async configureSimulation() {
        this.updateStatus('正在配置...');
        
        const nx = parseInt(document.getElementById('grid-nx').value);
        const nz = parseInt(document.getElementById('grid-nz').value);
        const dx = parseFloat(document.getElementById('grid-dx').value);
        const dz = parseFloat(document.getElementById('grid-dz').value);
        const vp = parseFloat(document.getElementById('vp').value);
        const vs = parseFloat(document.getElementById('vs').value);
        const rho = parseFloat(document.getElementById('rho').value);
        
        const sourceType = document.getElementById('source-type').value;
        const sourceFreq = parseFloat(document.getElementById('source-freq').value);
        const sourceX = parseInt(document.getElementById('source-x').value);
        const sourceZ = parseInt(document.getElementById('source-z').value);
        const sourceAmp = parseFloat(document.getElementById('source-amp').value);
        
        const arrayType = document.getElementById('array-type').value;
        const arrayNum = parseInt(document.getElementById('array-num').value);
        const arrayStartX = parseInt(document.getElementById('array-start-x').value);
        const arrayStartZ = parseInt(document.getElementById('array-start-z').value);
        const arrayEndX = parseInt(document.getElementById('array-end-x').value);
        const arrayEndZ = parseInt(document.getElementById('array-end-z').value);
        
        this.state.sourcePosition = { x: sourceX, z: sourceZ };
        
        try {
            const arrayResponse = await fetch('/api/receivers/array', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: arrayType,
                    start_x: arrayStartX,
                    start_z: arrayStartZ,
                    end_x: arrayEndX,
                    end_z: arrayEndZ,
                    num_receivers: arrayNum
                })
            });
            
            const arrayData = await arrayResponse.json();
            
            if (!arrayData.success) {
                throw new Error(arrayData.message);
            }
            
            this.state.receivers = arrayData.receivers;
            this.state.receiverNames = arrayData.receivers.map(r => r.name);
            
            this.updateReceiverSelect();
            
            const config = {
                nx, nz, dx, dz, vp, vs, rho,
                pml_width: 20,
                source: {
                    type: sourceType,
                    frequency: sourceFreq,
                    amplitude: sourceAmp,
                    x: sourceX,
                    z: sourceZ
                },
                receivers: arrayData.receivers
            };
            
            const response = await fetch('/api/configure', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            });
            
            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.message);
            }
            
            this.state.configured = true;
            this.state.dt = data.result.dt;
            this.state.frames = [];
            this.state.receiverData = {};
            this.state.currentStep = 0;
            this.state.currentFrameIndex = 0;
            
            document.getElementById('dt-text').textContent = data.result.dt.toFixed(6) + ' s';
            
            this.updateStatus('已配置', 'configured');
            document.getElementById('btn-run').textContent = '开始模拟';
            this.enableButton('btn-run');
            this.disableButton('btn-pause');
            
            this.drawEmptyWavefield();
            this.drawSeismogram();
            
        } catch (error) {
            this.updateStatus('配置失败: ' + error.message);
        }
    }

    updateReceiverSelect() {
        const select = document.getElementById('selected-receiver');
        select.innerHTML = '';
        this.state.receiverNames.forEach((name, index) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
    }

    async runSimulation() {
        if (this.state.running && !this.state.paused) {
            return;
        }

        if (this.state.paused) {
            this.resumeAnimation();
            return;
        }

        if (this.state.playbackMode && this.state.frames.length > 0) {
            this.startPlayback();
            return;
        }

        const totalSteps = parseInt(document.getElementById('total-steps').value);
        const frameInterval = parseInt(document.getElementById('frame-interval').value);
        this.state.totalSteps = totalSteps;
        
        this.state.running = true;
        this.state.paused = false;
        this.updateStatus('模拟中...', 'running');
        this.enableButton('btn-pause');
        this.disableButton('btn-run');
        this.disableButton('btn-configure');

        try {
            await this.runSimulationSteps(totalSteps, frameInterval);
        } catch (error) {
            this.updateStatus('模拟失败: ' + error.message);
            this.state.running = false;
        }
    }

    startPlayback() {
        this.state.running = true;
        this.state.paused = false;
        this.state.currentFrameIndex = 0;
        this.state.currentStep = 0;
        this.updateStatus('回放中...', 'running');
        this.enableButton('btn-pause');
        this.disableButton('btn-run');
        this.disableButton('btn-configure');

        const frameInterval = parseInt(document.getElementById('frame-interval').value);
        this.state.totalSteps = this.state.frames.length * frameInterval;

        this.playbackFrames();
    }

    playbackFrames() {
        const speed = parseInt(document.getElementById('speed').value);
        const frameInterval = parseInt(document.getElementById('frame-interval').value);

        const playFrame = () => {
            if (!this.state.running || this.state.paused) return;

            if (this.state.currentFrameIndex >= this.state.frames.length) {
                this.finishPlayback();
                return;
            }

            const frame = this.state.frames[this.state.currentFrameIndex];
            this.state.currentStep = (this.state.currentFrameIndex + 1) * frameInterval;
            this.state.currentFrameIndex++;

            this.update();
            this.drawWavefield(frame);
            this.drawSeismogram();

            this.state.animationInterval = setTimeout(playFrame, speed);
        };

        playFrame();
    }

    finishPlayback() {
        this.state.running = false;
        this.state.paused = false;
        if (this.state.animationInterval) {
            clearTimeout(this.state.animationInterval);
            this.state.animationInterval = null;
        }
        this.updateStatus('回放完成', 'configured');
        this.disableButton('btn-pause');
        this.enableButton('btn-configure');
        this.enableButton('btn-run');
    }

    async runSimulationSteps(totalSteps, frameInterval) {
        const speed = parseInt(document.getElementById('speed').value);
        
        const runStep = async () => {
            if (!this.state.running || this.state.paused) return;
            
            if (this.state.currentStep >= totalSteps) {
                this.finishSimulation();
                return;
            }
            
            try {
                const response = await fetch('/api/step', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ num_steps: frameInterval })
                });
                
                const data = await response.json();
                
                if (!data.success) {
                    throw new Error(data.message);
                }
                
                this.state.frames.push(data.wavefield);
                this.state.receiverData = data.receiver_data;
                this.state.currentStep = data.step;
                
                this.update();
                
                this.state.currentFrameIndex = this.state.frames.length - 1;
                this.drawWavefield(data.wavefield);
                this.drawSeismogram();
                
                this.state.animationInterval = setTimeout(runStep, speed);
                
            } catch (error) {
                throw error;
            }
        };
        
        runStep();
    }

    update() {
        document.getElementById('step-text').textContent = this.state.currentStep;
        document.getElementById('time-text').textContent = 
            (this.state.currentStep * this.state.dt).toFixed(3) + ' s';
        
        const progress = (this.state.currentStep / this.state.totalSteps) * 100;
        document.getElementById('progress-fill').style.width = progress + '%';
        document.getElementById('progress-text').textContent = progress.toFixed(1) + '%';
    }

    togglePause() {
        if (this.state.paused) {
            this.resumeAnimation();
        } else {
            this.pauseAnimation();
        }
    }

    pauseAnimation() {
        this.state.paused = true;
        if (this.state.animationInterval) {
            clearTimeout(this.state.animationInterval);
            this.state.animationInterval = null;
        }
        document.getElementById('btn-pause').textContent = '继续';
        this.updateStatus('已暂停');
    }

    resumeAnimation() {
        this.state.paused = false;
        document.getElementById('btn-pause').textContent = '暂停';
        if (this.state.playbackMode) {
            this.updateStatus('回放中...', 'running');
            this.playbackFrames();
        } else {
            this.updateStatus('模拟中...', 'running');
            const frameInterval = parseInt(document.getElementById('frame-interval').value);
            this.runSimulationSteps(this.state.totalSteps, frameInterval);
        }
    }

    finishSimulation() {
        this.state.running = false;
        this.state.paused = false;
        this.state.playbackMode = true;
        if (this.state.animationInterval) {
            clearTimeout(this.state.animationInterval);
            this.state.animationInterval = null;
        }
        this.updateStatus('已完成', 'configured');
        this.disableButton('btn-pause');
        this.enableButton('btn-configure');
        document.getElementById('btn-run').textContent = '重新播放';
        this.enableButton('btn-run');
    }

    async resetSimulation() {
        if (this.state.animationInterval) {
            clearTimeout(this.state.animationInterval);
            this.state.animationInterval = null;
        }
        
        await fetch('/api/reset', { method: 'POST' });
        
        this.state.configured = false;
        this.state.running = false;
        this.state.paused = false;
        this.state.currentStep = 0;
        this.state.frames = [];
        this.state.receiverData = {};
        this.state.currentFrameIndex = 0;
        this.state.playbackMode = false;
        
        document.getElementById('step-text').textContent = '0';
        document.getElementById('time-text').textContent = '0.000 s';
        document.getElementById('dt-text').textContent = '-';
        document.getElementById('progress-fill').style.width = '0%';
        document.getElementById('progress-text').textContent = '0%';
        
        this.updateStatus('未初始化');
        this.disableButton('btn-run');
        this.disableButton('btn-pause');
        this.enableButton('btn-configure');
        document.getElementById('btn-run').textContent = '开始模拟';
        document.getElementById('btn-pause').textContent = '暂停';
        
        this.drawEmptyWavefield();
        this.drawEmptySeismogram();
    }

    drawEmptyWavefield() {
        const ctx = this.ctxs.wavefield;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.canvases.wavefield.width, this.canvases.wavefield.height);
        
        this.drawSourceMarker();
        this.drawReceiverMarkers();
    }

    drawEmptySeismogram() {
        const ctx = this.ctxs.seismogram;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.canvases.seismogram.width, this.canvases.seismogram.height);
    }

    drawWavefield(data) {
        if (!data || !this.state.configured) return;
        
        const ctx = this.ctxs.wavefield;
        const canvas = this.canvases.wavefield;
        const nx = data[0].length;
        const nz = data.length;
        
        const colormapName = document.getElementById('colormap').value;
        const colormap = this.colormaps[colormapName];
        
        let maxVal = 0;
        for (let i = 0; i < nz; i++) {
            for (let j = 0; j < nx; j++) {
                const absVal = Math.abs(data[i][j]);
                if (absVal > maxVal) maxVal = absVal;
            }
        }
        
        if (maxVal === 0) maxVal = 1e-10;
        
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        const pixels = imageData.data;
        
        const scaleX = canvas.width / nx;
        const scaleZ = canvas.height / nz;
        
        for (let px = 0; px < canvas.height; px++) {
            for (let py = 0; py < canvas.width; py++) {
                const i = Math.floor(px / scaleZ);
                const j = Math.floor(py / scaleX);
                
                let val = data[Math.min(i, nz - 1)][Math.min(j, nx - 1)];
                let normalized = (val / maxVal + 1) / 2;
                normalized = Math.max(0, Math.min(1, normalized));
                
                const colorIdx = Math.floor(normalized * 255);
                const [r, g, b] = colormap[colorIdx];
                
                const pixelIdx = (px * canvas.width + py) * 4;
                pixels[pixelIdx] = r;
                pixels[pixelIdx + 1] = g;
                pixels[pixelIdx + 2] = b;
                pixels[pixelIdx + 3] = 255;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        this.drawSourceMarker();
        this.drawReceiverMarkers();
        
        document.getElementById('color-max').textContent = '+' + maxVal.toExponential(2);
        document.getElementById('color-min').textContent = '-' + maxVal.toExponential(2);
    }

    drawSourceMarker() {
        const ctx = this.ctxs.wavefield;
        const canvas = this.canvases.wavefield;
        const nx = parseInt(document.getElementById('grid-nx').value);
        const nz = parseInt(document.getElementById('grid-nz').value);
        
        const x = (this.state.sourcePosition.x / nx) * canvas.width;
        const z = (this.state.sourcePosition.z / nz) * canvas.height;
        
        ctx.beginPath();
        ctx.arc(x, z, 8, 0, Math.PI * 2);
        ctx.fillStyle = '#ff4444';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('S', x, z + 4);
    }

    drawReceiverMarkers() {
        if (!this.state.receivers) return;
        
        const ctx = this.ctxs.wavefield;
        const canvas = this.canvases.wavefield;
        const nx = parseInt(document.getElementById('grid-nx').value);
        const nz = parseInt(document.getElementById('grid-nz').value);
        
        this.state.receivers.forEach((rec, idx) => {
            const x = (rec.x / nx) * canvas.width;
            const z = (rec.z / nz) * canvas.height;
            
            ctx.beginPath();
            ctx.moveTo(x, z - 6);
            ctx.lineTo(x - 5, z + 6);
            ctx.lineTo(x + 5, z + 6);
            ctx.closePath();
            ctx.fillStyle = '#44ff44';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.stroke();
            
            if (this.state.receivers.length <= 20) {
                ctx.fillStyle = '#ffffff';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(idx.toString(), x, z + 18);
            }
        });
    }

    drawColorbar() {
        const ctx = this.ctxs.colorbar;
        const canvas = this.canvases.colorbar;
        const colormapName = document.getElementById('colormap').value;
        const colormap = this.colormaps[colormapName];
        
        for (let i = 0; i < canvas.height; i++) {
            const idx = Math.floor((1 - i / canvas.height) * 255);
            const [r, g, b] = colormap[Math.min(idx, 255)];
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(0, i, canvas.width, 1);
        }
    }

    drawSeismogram() {
        const ctx = this.ctxs.seismogram;
        const canvas = this.canvases.seismogram;
        
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (!this.state.configured) return;
        
        const receiverNames = this.state.receiverNames;
        if (receiverNames.length === 0) return;
        
        const showAll = document.getElementById('show-all-traces').checked;
        const selectedReceiver = document.getElementById('selected-receiver').value;
        
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const y = (i / 10) * canvas.height;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        ctx.strokeStyle = '#555555';
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
        ctx.stroke();
        
        const dt = this.state.dt;
        
        const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181', '#aa96da', '#fcbad3', '#a8d8ea'];
        
        if (showAll) {
            const numTraces = Math.min(receiverNames.length, 20);
            const traceSpacing = canvas.width / (numTraces + 1);
            
            for (let tIdx = 0; tIdx < numTraces; tIdx++) {
                const name = receiverNames[tIdx];
                const data = this.state.receiverData[name];
                if (!data || data.length === 0) continue;
                
                const color = colors[tIdx % colors.length];
                const xCenter = traceSpacing * (tIdx + 1);
                
                let maxVal = 0;
                for (let i = 0; i < data.length; i++) {
                    if (Math.abs(data[i]) > maxVal) maxVal = Math.abs(data[i]);
                }
                if (maxVal === 0) maxVal = 1;
                
                const scale = (traceSpacing * 0.4) / maxVal;
                
                ctx.strokeStyle = color;
                ctx.lineWidth = 1;
                ctx.beginPath();
                
                for (let i = 0; i < data.length; i++) {
                    const y = (i / data.length) * canvas.height;
                    const x = xCenter + data[i] * scale;
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
                
                ctx.fillStyle = color;
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(name.replace('REC_', ''), xCenter, 15);
            }
        } else {
            const data = this.state.receiverData[selectedReceiver];
            if (data && data.length > 0) {
                let maxVal = 0;
                for (let i = 0; i < data.length; i++) {
                    if (Math.abs(data[i]) > maxVal) maxVal = Math.abs(data[i]);
                }
                if (maxVal === 0) maxVal = 1;
                
                const centerX = canvas.width / 2;
                const scale = (canvas.width * 0.4) / maxVal;
                
                ctx.fillStyle = 'rgba(78, 205, 196, 0.3)';
                ctx.beginPath();
                ctx.moveTo(centerX, 0);
                
                for (let i = 0; i < data.length; i++) {
                    const y = (i / data.length) * canvas.height;
                    const x = centerX + data[i] * scale;
                    ctx.lineTo(x, y);
                }
                
                ctx.lineTo(centerX, canvas.height);
                ctx.closePath();
                ctx.fill();
                
                ctx.strokeStyle = '#4ecdc4';
                ctx.lineWidth = 2;
                ctx.beginPath();
                
                for (let i = 0; i < data.length; i++) {
                    const y = (i / data.length) * canvas.height;
                    const x = centerX + data[i] * scale;
                    
                    if (i === 0) {
                        ctx.moveTo(x, y);
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
                ctx.stroke();
                
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Arial';
                ctx.textAlign = 'left';
                ctx.fillText(`接收器: ${selectedReceiver}`, 10, 20);
                ctx.fillText(`最大值: ${maxVal.toExponential(2)}`, 10, 40);
                ctx.fillText(`采样点数: ${data.length}`, 10, 60);
            }
        }
        
        ctx.fillStyle = '#888888';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText('时间轴', canvas.width - 10, canvas.height - 5);
    }

    updateStatus(text, className = '') {
        const statusText = document.getElementById('status-text');
        statusText.textContent = text;
        statusText.className = 'status-value ' + className;
    }

    enableButton(id) {
        document.getElementById(id).disabled = false;
    }

    disableButton(id) {
        document.getElementById(id).disabled = true;
    }

    addReceiver(x, z) {
        const existing = this.state.receivers.find(r => r.x === x && r.z === z);
        if (existing) {
            this.showMessage('该位置已有接收器');
            return;
        }
        
        const name = `REC_${this.state.receivers.length.toString().padStart(3, '0')}`;
        this.state.receivers.push({ x, z, name });
        this.state.receiverNames.push(name);
        this.updateReceiverSelect();
        this.drawEmptyWavefield();
        this.showMessage(`已添加接收器 ${name}，点击"初始化模拟"应用配置`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new SeismicSimulationApp();
});
