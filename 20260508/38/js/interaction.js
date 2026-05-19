class InteractionManager {
    constructor(camera, gallery, cameraController, modal) {
        this.camera = camera;
        this.gallery = gallery;
        this.cameraController = cameraController;
        this.modal = modal;
        
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        this.hoveredImage = null;
        this.selectedImage = null;
        this.isModalOpen = false;
        
        this.dragThreshold = 5;
        this.mouseDownPosition = { x: 0, y: 0 };
        this.isDragging = false;
        this.isNavigating = false;
        
        this.init();
    }

    init() {
        const container = document.getElementById('container');
        
        container.addEventListener('mousedown', (e) => this.onMouseDown(e));
        container.addEventListener('mousemove', (e) => this.onMouseMove(e));
        container.addEventListener('mouseup', (e) => this.onMouseUp(e));
        container.addEventListener('click', (e) => this.onClick(e));
        
        container.addEventListener('touchstart', (e) => this.onTouchStart(e));
        container.addEventListener('touchend', (e) => this.onTouchEnd(e));
        
        this.modal.onClose(() => this.onModalClose());
        this.modal.onPrev(() => this.navigateImage(-1));
        this.modal.onNext(() => this.navigateImage(1));
        
        document.addEventListener('keydown', (e) => this.onKeyDown(e));
    }

    onMouseDown(event) {
        this.mouseDownPosition = { x: event.clientX, y: event.clientY };
        this.isDragging = false;
    }

    onMouseMove(event) {
        if (this.isModalOpen) return;
        
        const dx = event.clientX - this.mouseDownPosition.x;
        const dy = event.clientY - this.mouseDownPosition.y;
        if (Math.abs(dx) > this.dragThreshold || Math.abs(dy) > this.dragThreshold) {
            this.isDragging = true;
        }
        
        this.updateMouse(event);
        this.checkHover();
    }

    onMouseUp(event) {
        this.updateMouse(event);
    }

    onClick(event) {
        if (this.isModalOpen || this.isDragging) return;
        
        this.updateMouse(event);
        this.checkClick();
    }

    onTouchStart(event) {
        if (event.touches.length === 1) {
            this.mouseDownPosition = { 
                x: event.touches[0].clientX, 
                y: event.touches[0].clientY 
            };
            this.isDragging = false;
        }
    }

    onTouchEnd(event) {
        if (this.isModalOpen || this.isDragging) return;
        
        if (event.changedTouches.length === 1) {
            const touch = event.changedTouches[0];
            this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;
            this.checkClick();
        }
    }

    onKeyDown(event) {
        if (this.isModalOpen) {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.modal.close();
            } else if (event.key === 'ArrowLeft') {
                event.preventDefault();
                this.navigateImage(-1);
            } else if (event.key === 'ArrowRight') {
                event.preventDefault();
                this.navigateImage(1);
            }
        }
    }

    updateMouse(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    checkHover() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.gallery.images);
        
        if (intersects.length > 0) {
            const image = intersects[0].object;
            if (this.hoveredImage !== image) {
                this.hoveredImage = image;
                document.body.style.cursor = 'pointer';
            }
            this.gallery.updateHoverEffect(image);
        } else {
            if (this.hoveredImage) {
                this.hoveredImage = null;
                document.body.style.cursor = 'default';
            }
            this.gallery.updateHoverEffect(null);
        }
    }

    checkClick() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.gallery.images);
        
        if (intersects.length > 0) {
            const image = intersects[0].object;
            this.selectImage(image);
        }
    }

    selectImage(image) {
        this.selectedImage = image;
        this.isModalOpen = true;
        
        this.cameraController.focusOnImage(image, () => {
            this.gallery.animateImageToCenter(image, () => {
                const data = image.userData.data;
                this.modal.open(data);
            });
        });
        
        this.cameraController.setAutoRotate(false);
    }

    onModalClose() {
        if (this.selectedImage) {
            this.gallery.animateImageBack(this.selectedImage, () => {
                this.cameraController.resetPosition(() => {
                    this.selectedImage = null;
                    this.isModalOpen = false;
                    this.cameraController.setAutoRotate(true);
                });
            });
        }
    }

    navigateImage(direction) {
        if (!this.selectedImage || this.isNavigating) return;
        
        const currentIndex = this.selectedImage.userData.index;
        let newIndex = currentIndex + direction;
        const total = this.gallery.getTotalImages();
        
        if (newIndex < 0) newIndex = total - 1;
        if (newIndex >= total) newIndex = 0;
        
        const newImage = this.gallery.getImageByIndex(newIndex);
        if (!newImage || newImage === this.selectedImage) return;
        
        this.isNavigating = true;
        const prevImage = this.selectedImage;
        
        prevImage.userData.isSelected = false;
        prevImage.position.copy(prevImage.userData.originalPosition);
        prevImage.rotation.copy(prevImage.userData.originalRotation);
        prevImage.scale.copy(prevImage.userData.originalScale);
        
        this.selectedImage = newImage;
        newImage.userData.isSelected = true;
        
        const centerPosition = new THREE.Vector3(0, 0, 5);
        const centerRotation = new THREE.Euler(0, 0, 0);
        const centerScale = new THREE.Vector3(2, 2, 2);
        
        newImage.position.copy(centerPosition);
        newImage.rotation.copy(centerRotation);
        newImage.scale.copy(centerScale);
        
        const data = newImage.userData.data;
        this.modal.updateContent(data);
        
        this.cameraController.focusOnImage(newImage, () => {
            this.isNavigating = false;
        }, false);
    }
}

export { InteractionManager };
