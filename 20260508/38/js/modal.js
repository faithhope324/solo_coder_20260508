class Modal {
    constructor() {
        this.modal = document.getElementById('modal');
        this.modalImage = document.getElementById('modal-image');
        this.modalTitle = document.getElementById('modal-title');
        this.modalDescription = document.getElementById('modal-description');
        this.closeButton = document.querySelector('.modal-close');
        this.prevButton = document.querySelector('.modal-prev');
        this.nextButton = document.querySelector('.modal-next');
        this.overlay = document.querySelector('.modal-overlay');
        
        this.onCloseCallback = null;
        this.onPrevCallback = null;
        this.onNextCallback = null;
        
        this.isOpen = false;
        this.isAnimating = false;
        
        this.init();
    }

    init() {
        this.closeButton.addEventListener('click', () => this.close());
        this.overlay.addEventListener('click', () => this.close());
        this.prevButton.addEventListener('click', () => this.prev());
        this.nextButton.addEventListener('click', () => this.next());
    }

    onClose(callback) {
        this.onCloseCallback = callback;
    }

    onPrev(callback) {
        this.onPrevCallback = callback;
    }

    onNext(callback) {
        this.onNextCallback = callback;
    }

    open(data) {
        if (this.isOpen || this.isAnimating) return;
        
        this.isAnimating = true;
        this.updateContent(data);
        
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        const info = document.getElementById('info');
        if (info) info.classList.add('hidden');
        
        setTimeout(() => {
            this.isOpen = true;
            this.isAnimating = false;
        }, 400);
    }

    close() {
        if (!this.isOpen || this.isAnimating) return;
        
        this.isAnimating = true;
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
        
        const info = document.getElementById('info');
        if (info) info.classList.remove('hidden');
        
        setTimeout(() => {
            this.isOpen = false;
            this.isAnimating = false;
            if (this.onCloseCallback) {
                this.onCloseCallback();
            }
        }, 400);
    }

    prev() {
        if (!this.isOpen || this.isAnimating) return;
        if (this.onPrevCallback) {
            this.onPrevCallback();
        }
    }

    next() {
        if (!this.isOpen || this.isAnimating) return;
        if (this.onNextCallback) {
            this.onNextCallback();
        }
    }

    updateContent(data) {
        this.modalImage.style.opacity = '0';
        
        setTimeout(() => {
            this.modalImage.src = data.url;
            this.modalImage.alt = data.title;
            this.modalTitle.textContent = data.title;
            this.modalDescription.textContent = data.description;
            
            this.modalImage.onload = () => {
                this.modalImage.style.opacity = '1';
            };
            
            if (this.modalImage.complete) {
                this.modalImage.style.opacity = '1';
            }
        }, 150);
    }
}

export { Modal };
