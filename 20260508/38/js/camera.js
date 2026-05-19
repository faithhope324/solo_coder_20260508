class CameraController {
    constructor(camera, container) {
        this.camera = camera;
        this.container = container;
        
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        
        this.rotationSpeed = 0.005;
        this.autoRotateSpeed = 0.001;
        this.isAutoRotating = true;
        
        this.radius = 18;
        this.minRadius = 10;
        this.maxRadius = 30;
        
        this.theta = 0;
        this.phi = Math.PI / 2.5;
        this.targetPhi = this.phi;
        this.minPhi = Math.PI / 4;
        this.maxPhi = Math.PI / 1.5;
        
        this.target = new THREE.Vector3(0, 0, 0);
        this.isLocked = false;
        
        this.savedTheta = this.theta;
        this.savedPhi = this.phi;
        this.savedRadius = this.radius;
        
        this.init();
    }

    init() {
        this.updateCameraPosition();
        
        this.container.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.container.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.container.addEventListener('mouseup', () => this.onMouseUp());
        this.container.addEventListener('mouseleave', () => this.onMouseUp());
        
        this.container.addEventListener('wheel', (e) => this.onWheel(e));
        
        this.container.addEventListener('touchstart', (e) => this.onTouchStart(e));
        this.container.addEventListener('touchmove', (e) => this.onTouchMove(e));
        this.container.addEventListener('touchend', () => this.onTouchEnd());
    }

    updateCameraPosition() {
        this.camera.position.x = this.radius * Math.sin(this.phi) * Math.cos(this.theta);
        this.camera.position.y = this.radius * Math.cos(this.phi);
        this.camera.position.z = this.radius * Math.sin(this.phi) * Math.sin(this.theta);
        this.camera.lookAt(this.target);
    }

    onMouseDown(event) {
        if (this.isLocked) return;
        this.isDragging = true;
        this.isAutoRotating = false;
        this.previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }

    onMouseMove(event) {
        if (!this.isDragging || this.isLocked) return;
        
        const deltaX = event.clientX - this.previousMousePosition.x;
        const deltaY = event.clientY - this.previousMousePosition.y;
        
        this.theta -= deltaX * this.rotationSpeed;
        this.targetPhi += deltaY * this.rotationSpeed;
        this.targetPhi = Math.max(this.minPhi, Math.min(this.maxPhi, this.targetPhi));
        
        this.previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    }

    onMouseUp() {
        this.isDragging = false;
    }

    onTouchStart(event) {
        if (this.isLocked) return;
        if (event.touches.length === 1) {
            this.isDragging = true;
            this.isAutoRotating = false;
            this.previousMousePosition = {
                x: event.touches[0].clientX,
                y: event.touches[0].clientY
            };
        }
    }

    onTouchMove(event) {
        if (!this.isDragging || this.isLocked || event.touches.length !== 1) return;
        
        const deltaX = event.touches[0].clientX - this.previousMousePosition.x;
        const deltaY = event.touches[0].clientY - this.previousMousePosition.y;
        
        this.theta -= deltaX * this.rotationSpeed;
        this.targetPhi += deltaY * this.rotationSpeed;
        this.targetPhi = Math.max(this.minPhi, Math.min(this.maxPhi, this.targetPhi));
        
        this.previousMousePosition = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY
        };
        
        event.preventDefault();
    }

    onTouchEnd() {
        this.isDragging = false;
    }

    onWheel(event) {
        if (this.isLocked) return;
        event.preventDefault();
        const delta = event.deltaY > 0 ? 1 : -1;
        this.radius += delta * 1.5;
        this.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this.radius));
    }

    update() {
        if (this.isLocked) return;
        
        if (this.isAutoRotating) {
            this.theta += this.autoRotateSpeed;
        }
        
        this.phi = THREE.MathUtils.lerp(this.phi, this.targetPhi, 0.1);
        this.updateCameraPosition();
    }

    focusOnImage(image, onComplete, saveState = true) {
        this.isLocked = true;
        
        if (saveState) {
            this.savedTheta = this.theta;
            this.savedPhi = this.phi;
            this.savedRadius = this.radius;
        }
        
        const imagePosition = image.position.clone();
        const direction = imagePosition.clone().normalize();
        const distance = 8;
        
        const targetPosition = new THREE.Vector3(
            -direction.x * distance,
            1,
            -direction.z * distance
        );
        
        const startPosition = this.camera.position.clone();
        const startTarget = this.target.clone();
        const endTarget = imagePosition.clone();
        
        let progress = 0;
        const duration = 800;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            this.camera.position.lerpVectors(startPosition, targetPosition, eased);
            this.target.lerpVectors(startTarget, endTarget, eased);
            this.camera.lookAt(this.target);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else if (onComplete) {
                onComplete();
            }
        };
        animate();
    }

    resetPosition(onComplete) {
        const startPosition = this.camera.position.clone();
        const startTarget = this.target.clone();
        const endTarget = new THREE.Vector3(0, 0, 0);
        
        this.theta = this.savedTheta;
        this.phi = this.savedPhi;
        this.targetPhi = this.savedPhi;
        this.radius = this.savedRadius;
        
        const endPosition = new THREE.Vector3(
            this.radius * Math.sin(this.phi) * Math.cos(this.theta),
            this.radius * Math.cos(this.phi),
            this.radius * Math.sin(this.phi) * Math.sin(this.theta)
        );
        
        let progress = 0;
        const duration = 600;
        const startTime = Date.now();
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            this.camera.position.lerpVectors(startPosition, endPosition, eased);
            this.target.lerpVectors(startTarget, endTarget, eased);
            this.camera.lookAt(this.target);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isLocked = false;
                this.isAutoRotating = true;
                if (onComplete) {
                    onComplete();
                }
            }
        };
        animate();
    }

    setAutoRotate(value) {
        if (!this.isLocked) {
            this.isAutoRotating = value;
        }
    }
}

export { CameraController };
