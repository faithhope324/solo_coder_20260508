export class ControlPanel {
    constructor(defaultParams = {}) {
        this.defaultParams = {
            radius: 5,
            width: 2,
            twist: 1,
            segments: 100,
            widthSegments: 20,
            wireframe: true,
            showNormals: false,
            autoRotate: true,
            surfaceColor: '#e94560',
            normalLength: 0.3,
            rotationSpeed: 0.5
        };
        
        Object.assign(this.defaultParams, defaultParams);
        this.callbacks = {};
        
        this.initElements();
        this.initEventListeners();
    }
    
    initElements() {
        this.elements = {
            radius: document.getElementById('radius'),
            radiusValue: document.getElementById('radius-value'),
            width: document.getElementById('width'),
            widthValue: document.getElementById('width-value'),
            twist: document.getElementById('twist'),
            twistValue: document.getElementById('twist-value'),
            segments: document.getElementById('segments'),
            segmentsValue: document.getElementById('segments-value'),
            widthSegments: document.getElementById('width-segments'),
            widthSegmentsValue: document.getElementById('width-segments-value'),
            wireframe: document.getElementById('wireframe'),
            showNormals: document.getElementById('show-normals'),
            autoRotate: document.getElementById('auto-rotate'),
            surfaceColor: document.getElementById('surface-color'),
            normalLength: document.getElementById('normal-length'),
            normalLengthValue: document.getElementById('normal-length-value'),
            rotationSpeed: document.getElementById('rotation-speed'),
            rotationSpeedValue: document.getElementById('rotation-speed-value'),
            resetBtn: document.getElementById('reset-btn'),
            vertexCount: document.getElementById('vertex-count')
        };
        
        this.setValues(this.defaultParams);
    }
    
    initEventListeners() {
        this.elements.radius.addEventListener('input', (e) => {
            this.updateValueDisplay('radius', e.target.value);
            this.notify('geometryChange', this.getGeometryParams());
        });
        
        this.elements.width.addEventListener('input', (e) => {
            this.updateValueDisplay('width', e.target.value);
            this.notify('geometryChange', this.getGeometryParams());
        });
        
        this.elements.twist.addEventListener('input', (e) => {
            this.updateValueDisplay('twist', e.target.value);
            this.notify('geometryChange', this.getGeometryParams());
        });
        
        this.elements.segments.addEventListener('input', (e) => {
            this.updateValueDisplay('segments', e.target.value);
            this.notify('geometryChange', this.getGeometryParams());
        });
        
        this.elements.widthSegments.addEventListener('input', (e) => {
            this.updateValueDisplay('widthSegments', e.target.value);
            this.notify('geometryChange', this.getGeometryParams());
        });
        
        this.elements.wireframe.addEventListener('change', (e) => {
            this.notify('wireframeChange', e.target.checked);
        });
        
        this.elements.showNormals.addEventListener('change', (e) => {
            this.notify('showNormalsChange', e.target.checked);
        });
        
        this.elements.autoRotate.addEventListener('change', (e) => {
            this.notify('autoRotateChange', e.target.checked);
        });
        
        this.elements.surfaceColor.addEventListener('input', (e) => {
            this.notify('colorChange', e.target.value);
        });
        
        this.elements.normalLength.addEventListener('input', (e) => {
            this.updateValueDisplay('normalLength', e.target.value);
            this.notify('normalLengthChange', parseFloat(e.target.value));
        });
        
        this.elements.rotationSpeed.addEventListener('input', (e) => {
            this.updateValueDisplay('rotationSpeed', e.target.value);
            this.notify('rotationSpeedChange', parseFloat(e.target.value));
        });
        
        this.elements.resetBtn.addEventListener('click', () => {
            this.reset();
        });
    }
    
    updateValueDisplay(key, value) {
        const valueElement = this.elements[key + 'Value'] || this.elements[key + '-value'];
        if (valueElement) {
            valueElement.textContent = value;
        }
    }
    
    setValues(params) {
        if (params.radius !== undefined) {
            this.elements.radius.value = params.radius;
            this.updateValueDisplay('radius', params.radius);
        }
        if (params.width !== undefined) {
            this.elements.width.value = params.width;
            this.updateValueDisplay('width', params.width);
        }
        if (params.twist !== undefined) {
            this.elements.twist.value = params.twist;
            this.updateValueDisplay('twist', params.twist);
        }
        if (params.segments !== undefined) {
            this.elements.segments.value = params.segments;
            this.updateValueDisplay('segments', params.segments);
        }
        if (params.widthSegments !== undefined) {
            this.elements.widthSegments.value = params.widthSegments;
            this.updateValueDisplay('widthSegments', params.widthSegments);
        }
        if (params.wireframe !== undefined) {
            this.elements.wireframe.checked = params.wireframe;
        }
        if (params.showNormals !== undefined) {
            this.elements.showNormals.checked = params.showNormals;
        }
        if (params.autoRotate !== undefined) {
            this.elements.autoRotate.checked = params.autoRotate;
        }
        if (params.surfaceColor !== undefined) {
            this.elements.surfaceColor.value = params.surfaceColor;
        }
        if (params.normalLength !== undefined) {
            this.elements.normalLength.value = params.normalLength;
            this.updateValueDisplay('normalLength', params.normalLength);
        }
        if (params.rotationSpeed !== undefined) {
            this.elements.rotationSpeed.value = params.rotationSpeed;
            this.updateValueDisplay('rotationSpeed', params.rotationSpeed);
        }
    }
    
    getGeometryParams() {
        return {
            radius: parseFloat(this.elements.radius.value),
            width: parseFloat(this.elements.width.value),
            twist: parseFloat(this.elements.twist.value),
            segments: parseInt(this.elements.segments.value),
            widthSegments: parseInt(this.elements.widthSegments.value)
        };
    }
    
    setVertexCount(count) {
        if (this.elements.vertexCount) {
            this.elements.vertexCount.textContent = count.toLocaleString();
        }
    }
    
    reset() {
        this.setValues(this.defaultParams);
        this.notify('geometryChange', this.getGeometryParams());
        this.notify('wireframeChange', this.defaultParams.wireframe);
        this.notify('showNormalsChange', this.defaultParams.showNormals);
        this.notify('autoRotateChange', this.defaultParams.autoRotate);
        this.notify('colorChange', this.defaultParams.surfaceColor);
        this.notify('normalLengthChange', this.defaultParams.normalLength);
        this.notify('rotationSpeedChange', this.defaultParams.rotationSpeed);
        this.notify('reset');
    }
    
    on(event, callback) {
        if (!this.callbacks[event]) {
            this.callbacks[event] = [];
        }
        this.callbacks[event].push(callback);
    }
    
    notify(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => callback(data));
        }
    }
}
