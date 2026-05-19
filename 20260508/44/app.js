class SpriteSheetGenerator {
    constructor() {
        this.images = [];
        this.draggedIndex = null;
        this.initElements();
        this.bindEvents();
    }

    initElements() {
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.imageList = document.getElementById('imageList');
        this.clearBtn = document.getElementById('clearBtn');
        this.columnsInput = document.getElementById('columns');
        this.paddingInput = document.getElementById('padding');
        this.bgColorInput = document.getElementById('bgColor');
        this.classPrefixInput = document.getElementById('classPrefix');
        this.generateBtn = document.getElementById('generateBtn');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.previewEmpty = document.getElementById('previewEmpty');
        this.actionButtons = document.getElementById('actionButtons');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.copyCssBtn = document.getElementById('copyCssBtn');
        this.cssOutput = document.getElementById('cssOutput');
        this.progressOverlay = document.getElementById('progressOverlay');
        this.progressText = document.getElementById('progressText');
        this.progressBarFill = document.getElementById('progressBarFill');
    }

    bindEvents() {
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        this.uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.uploadArea.classList.add('dragover');
        });
        
        this.uploadArea.addEventListener('dragleave', () => {
            this.uploadArea.classList.remove('dragover');
        });
        
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.uploadArea.classList.remove('dragover');
            this.handleFileDrop(e);
        });
        
        this.generateBtn.addEventListener('click', () => this.generate());
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
        this.copyCssBtn.addEventListener('click', () => this.copyCSS());
        this.clearBtn.addEventListener('click', () => this.clearAllImages());
    }

    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
        e.target.value = '';
    }

    handleFileDrop(e) {
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        this.processFiles(files);
    }

    async processFiles(files) {
        const validFiles = [];
        const duplicateNames = [];

        for (const file of files) {
            const fileName = file.name.replace(/\.[^/.]+$/, '');
            const isDuplicate = this.images.some(img => img.name === fileName) ||
                               validFiles.some(f => f.name.replace(/\.[^/.]+$/, '') === fileName);
            
            if (isDuplicate) {
                duplicateNames.push(file.name);
            } else {
                validFiles.push(file);
            }
        }

        if (duplicateNames.length > 0) {
            this.showToast(`存在同名文件: ${duplicateNames.join(', ')}，已跳过`, 'error');
        }

        if (validFiles.length === 0) {
            return;
        }

        this.showProgress(`正在加载图片...`, 0);
        
        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            try {
                const imageData = await this.loadImage(file);
                this.images.push(imageData);
                this.updateProgress(((i + 1) / validFiles.length) * 100, `正在加载图片... (${i + 1}/${validFiles.length})`);
            } catch (error) {
                this.showToast(`无法加载图片: ${file.name}`, 'error');
            }
        }
        
        this.hideProgress();
        this.renderImageList();
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    resolve({
                        name: file.name.replace(/\.[^/.]+$/, ''),
                        file: file,
                        src: e.target.result,
                        width: img.width,
                        height: img.height,
                        img: img
                    });
                };
                img.onerror = reject;
                img.src = e.target.result;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    renderImageList() {
        if (this.images.length === 0) {
            this.imageList.innerHTML = '<p class="empty-tip">暂无图片，请上传</p>';
            this.clearBtn.style.display = 'none';
            return;
        }

        this.clearBtn.style.display = 'flex';

        this.imageList.innerHTML = this.images.map((image, index) => `
            <div class="image-item" draggable="true" data-index="${index}">
                <img src="${image.src}" alt="${image.name}" class="image-thumb">
                <div class="image-info">
                    <div class="image-name">${image.name}</div>
                    <div class="image-size">${image.width} × ${image.height}px</div>
                </div>
                <button class="delete-btn" data-index="${index}" title="删除">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            </div>
        `).join('');

        this.imageList.querySelectorAll('.image-item').forEach(item => {
            item.addEventListener('dragstart', (e) => this.handleDragStart(e));
            item.addEventListener('dragend', (e) => this.handleDragEnd(e));
            item.addEventListener('dragover', (e) => this.handleDragOver(e));
            item.addEventListener('drop', (e) => this.handleDrop(e));
        });

        this.imageList.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                this.removeImage(index);
            });
        });
    }

    handleDragStart(e) {
        this.draggedIndex = parseInt(e.target.dataset.index);
        e.target.classList.add('dragging');
    }

    handleDragEnd(e) {
        e.target.classList.remove('dragging');
        this.imageList.querySelectorAll('.image-item').forEach(item => {
            item.classList.remove('drag-over');
        });
    }

    handleDragOver(e) {
        e.preventDefault();
        const item = e.target.closest('.image-item');
        if (item) {
            item.classList.add('drag-over');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        const targetItem = e.target.closest('.image-item');
        if (targetItem && this.draggedIndex !== null) {
            const targetIndex = parseInt(targetItem.dataset.index);
            this.swapImages(this.draggedIndex, targetIndex);
        }
        this.imageList.querySelectorAll('.image-item').forEach(item => {
            item.classList.remove('drag-over');
        });
    }

    swapImages(fromIndex, toIndex) {
        const [removed] = this.images.splice(fromIndex, 1);
        this.images.splice(toIndex, 0, removed);
        this.renderImageList();
    }

    removeImage(index) {
        this.images.splice(index, 1);
        this.renderImageList();
    }

    clearAllImages() {
        if (this.images.length === 0) return;
        
        if (confirm(`确定要清空所有 ${this.images.length} 张图片吗？`)) {
            this.images = [];
            this.canvas.width = 0;
            this.canvas.height = 0;
            this.canvas.style.display = 'none';
            this.previewEmpty.style.display = 'block';
            this.actionButtons.style.display = 'none';
            this.cssOutput.textContent = '/* CSS 代码将在这里生成 */';
            this.renderImageList();
            this.showToast('已清空所有图片', 'success');
        }
    }

    showProgress(text, percent = 0) {
        this.progressText.textContent = text;
        this.progressBarFill.style.width = `${percent}%`;
        this.progressOverlay.style.display = 'flex';
        this.generateBtn.disabled = true;
    }

    updateProgress(percent, text) {
        this.progressBarFill.style.width = `${percent}%`;
        if (text) {
            this.progressText.textContent = text;
        }
    }

    hideProgress() {
        this.progressOverlay.style.display = 'none';
        this.generateBtn.disabled = false;
    }

    calculateLayout() {
        const columns = parseInt(this.columnsInput.value) || 4;
        const padding = parseInt(this.paddingInput.value) || 0;

        if (this.images.length === 0) return null;

        const rows = Math.ceil(this.images.length / columns);

        const colWidths = [];
        const rowHeights = [];

        for (let col = 0; col < columns; col++) {
            let maxWidth = 0;
            for (let row = 0; row < rows; row++) {
                const index = row * columns + col;
                if (index < this.images.length) {
                    maxWidth = Math.max(maxWidth, this.images[index].width);
                }
            }
            colWidths.push(maxWidth);
        }

        for (let row = 0; row < rows; row++) {
            let maxHeight = 0;
            for (let col = 0; col < columns; col++) {
                const index = row * columns + col;
                if (index < this.images.length) {
                    maxHeight = Math.max(maxHeight, this.images[index].height);
                }
            }
            rowHeights.push(maxHeight);
        }

        const totalWidth = colWidths.reduce((a, b) => a + b, 0) + padding * (columns + 1);
        const totalHeight = rowHeights.reduce((a, b) => a + b, 0) + padding * (rows + 1);

        const positions = [];
        let y = padding;

        for (let row = 0; row < rows; row++) {
            let x = padding;
            for (let col = 0; col < columns; col++) {
                const index = row * columns + col;
                if (index < this.images.length) {
                    const image = this.images[index];
                    const cellWidth = colWidths[col];
                    const cellHeight = rowHeights[row];
                    const offsetX = Math.floor((cellWidth - image.width) / 2);
                    const offsetY = Math.floor((cellHeight - image.height) / 2);

                    positions.push({
                        image: image,
                        x: x + offsetX,
                        y: y + offsetY,
                        cellX: x,
                        cellY: y,
                        cellWidth: cellWidth,
                        cellHeight: cellHeight
                    });
                }
                x += colWidths[col] + padding;
            }
            y += rowHeights[row] + padding;
        }

        return {
            totalWidth,
            totalHeight,
            positions,
            columns,
            rows,
            padding
        };
    }

    async generate() {
        if (this.images.length === 0) {
            this.showToast('请先上传图片', 'error');
            return;
        }

        this.showProgress('正在计算布局...', 10);
        await this.sleep(200);

        const layout = this.calculateLayout();
        if (!layout) return;

        this.updateProgress(30, '正在创建画布...');
        await this.sleep(200);

        this.canvas.width = layout.totalWidth;
        this.canvas.height = layout.totalHeight;

        const bgColor = this.bgColorInput.value;
        this.ctx.fillStyle = bgColor;
        this.ctx.fillRect(0, 0, layout.totalWidth, layout.totalHeight);

        this.updateProgress(50, '正在合并图片...');
        
        for (let i = 0; i < layout.positions.length; i++) {
            const pos = layout.positions[i];
            this.ctx.drawImage(pos.image.img, pos.x, pos.y);
            const progress = 50 + ((i + 1) / layout.positions.length) * 40;
            this.updateProgress(progress, `正在合并图片... (${i + 1}/${layout.positions.length})`);
            await this.sleep(50);
        }

        this.updateProgress(95, '正在生成 CSS 代码...');
        await this.sleep(200);

        this.generateCSS(layout);
        
        this.updateProgress(100, '生成完成!');
        await this.sleep(300);
        
        this.hideProgress();

        this.previewEmpty.style.display = 'none';
        this.canvas.style.display = 'block';
        this.actionButtons.style.display = 'flex';

        this.showToast('精灵表生成成功!', 'success');
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    generateCSS(layout) {
        const prefix = this.classPrefixInput.value || 'sprite';
        let css = `/* 精灵表 CSS 代码 */
/* 总尺寸: ${layout.totalWidth}px × ${layout.totalHeight}px */
/* 图片数量: ${this.images.length} 张 */
/* 列数: ${layout.columns}, 行数: ${layout.rows} */
/* 间距: ${layout.padding}px */

.${prefix} {
    background-image: url('sprite-sheet.png');
    background-repeat: no-repeat;
    display: inline-block;
}

`;

        layout.positions.forEach((pos, index) => {
            const name = pos.image.name.replace(/[^a-zA-Z0-9_-]/g, '_');
            css += `.${prefix}-${name} {
    width: ${pos.image.width}px;
    height: ${pos.image.height}px;
    background-position: -${pos.x}px -${pos.y}px;
}

`;
        });

        this.cssOutput.textContent = css;
    }

    downloadImage() {
        const link = document.createElement('a');
        link.download = 'sprite-sheet.png';
        link.href = this.canvas.toDataURL('image/png');
        link.click();
        this.showToast('图片已下载!', 'success');
    }

    copyCSS() {
        const css = this.cssOutput.textContent;
        navigator.clipboard.writeText(css).then(() => {
            this.showToast('CSS 代码已复制到剪贴板!', 'success');
        }).catch(() => {
            this.showToast('复制失败，请手动复制', 'error');
        });
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2500);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SpriteSheetGenerator();
});
